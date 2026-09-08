import { OperatorCredential } from '@/types';

export type OperatorSyncMessage =
  | {
      type: 'OPERATOR_STATUS_CHANGED';
      payload: {
        id: string;
        status: 'Active' | 'Blocked';
        handle?: string;
        name?: string;
        role?: string;
      };
    }
  | { type: 'OPERATOR_CREATED'; payload: OperatorCredential }
  | { type: 'OPERATOR_UPDATED'; payload: OperatorCredential }
  | { type: 'OPERATOR_DELETED'; payload: { id: string } }
  | { type: 'SYNC_OPERATORS'; payload: OperatorCredential[] }
  | { type: 'REQUEST_SYNC' };

type Listener = (event: OperatorSyncMessage) => void;
type ConnectionListener = (connected: boolean) => void;

class OperatorSyncSocketService {
  private ws: WebSocket | null = null;
  private listeners: Set<Listener> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private isConnecting: boolean = false;
  private reconnectTimer: any = null;
  private clientId: string = `op-client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  private candidateUrls: string[] = [];
  private currentUrlIndex: number = 0;
  private isConnected: boolean = false;

  constructor() {
    // 1. Setup instant cross-tab BroadcastChannel for zero-latency real-time synchronization
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('chill_choc_operators_sync_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.senderId !== this.clientId) {
            this.notifyListeners(event.data.message);
          }
        };
      } catch (err) {
        console.warn('[OperatorSyncSocket] BroadcastChannel not supported or blocked:', err);
      }
    }

    // 2. Setup WebSocket candidate URLs
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      this.candidateUrls = [
        `${protocol}//${window.location.host}/ws/operators`,
        `ws://localhost:9200/operators`,
        `ws://127.0.0.1:9200/operators`,
      ];
      this.connect();
    }
  }

  public connect() {
    if (typeof window === 'undefined' || this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    const targetUrl = this.candidateUrls[this.currentUrlIndex] || `ws://${window.location.host}/ws/operators`;
    this.isConnecting = true;

    try {
      this.ws = new WebSocket(targetUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.isConnected = true;
        this.notifyConnectionListeners(true);
        console.log('[OperatorSyncSocket] Connected to WebSocket at', targetUrl);
        this.send({ type: 'REQUEST_SYNC' });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: OperatorSyncMessage = JSON.parse(event.data);
          this.notifyListeners(message);
        } catch (err) {
          console.error('[OperatorSyncSocket] Error parsing WS message:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.isConnected = false;
        this.notifyConnectionListeners(false);
        this.ws = null;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
        this.isConnected = false;
        this.notifyConnectionListeners(false);
        if (this.ws) {
          try {
            this.ws.close();
          } catch {}
        }
        this.scheduleReconnect();
      };
    } catch {
      this.isConnecting = false;
      this.isConnected = false;
      this.notifyConnectionListeners(false);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.currentUrlIndex = (this.currentUrlIndex + 1) % (this.candidateUrls.length || 1);
      this.connect();
    }, 3500);
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    listener(this.isConnected);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  public isSocketConnected(): boolean {
    return this.isConnected || (this.ws !== null && this.ws.readyState === WebSocket.OPEN);
  }

  private notifyConnectionListeners(status: boolean) {
    this.connectionListeners.forEach((l) => {
      try {
        l(status);
      } catch (e) {
        console.error('[OperatorSyncSocket] Connection listener error:', e);
      }
    });
  }

  private notifyListeners(message: OperatorSyncMessage) {
    this.listeners.forEach((listener) => {
      try {
        listener(message);
      } catch (err) {
        console.error('[OperatorSyncSocket] Error in message listener:', err);
      }
    });
  }

  public send(message: OperatorSyncMessage) {
    // 1. Post to local BroadcastChannel for instant zero-latency same-browser cross-tab sync
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          senderId: this.clientId,
          message,
        });
      } catch (err) {
        console.warn('[OperatorSyncSocket] Failed to post to BroadcastChannel:', err);
      }
    }

    // 2. Transmit to remote WebSocket if open
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (err) {
        console.error('[OperatorSyncSocket] Failed to send over WebSocket:', err);
      }
    }
  }
}

export const operatorSyncSocket = new OperatorSyncSocketService();
