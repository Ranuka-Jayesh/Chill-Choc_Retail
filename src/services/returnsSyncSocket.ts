import { ReturnRequest } from '@/types';

export type ReturnSyncMessage =
  | { type: 'RETURN_REQUESTED'; payload: ReturnRequest }
  | { type: 'RETURN_APPROVED'; payload: { id: string; notes?: string; reviewerName?: string } }
  | { type: 'RETURN_REJECTED'; payload: { id: string; notes?: string; reviewerName?: string } }
  | { type: 'SYNC_RETURNS'; payload: ReturnRequest[] }
  | { type: 'REQUEST_SYNC' };

type Listener = (event: ReturnSyncMessage) => void;

class ReturnsSyncSocketService {
  private ws: WebSocket | null = null;
  private listeners: Set<Listener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private isConnecting: boolean = false;
  private reconnectTimer: any = null;
  private clientId: string = `returns-client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  private candidateUrls: string[] = [];
  private currentUrlIndex: number = 0;

  constructor() {
    // 1. Setup instant cross-tab BroadcastChannel for zero-latency real-time communication
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('chill_choc_returns_sync_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.senderId !== this.clientId) {
            this.notifyListeners(event.data.message);
          }
        };
      } catch (err) {
        console.warn('[ReturnsSyncSocket] BroadcastChannel not supported or blocked:', err);
      }
    }

    // 2. Setup WebSocket connection
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      this.candidateUrls = [
        `${protocol}//${window.location.host}/ws/returns`,
        `ws://localhost:9200/returns`,
        `ws://127.0.0.1:9200/returns`,
      ];
      this.connect();
    }
  }

  public connect() {
    if (typeof window === 'undefined' || this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    const targetUrl = this.candidateUrls[this.currentUrlIndex] || `ws://${window.location.host}/ws/returns`;
    this.isConnecting = true;

    try {
      this.ws = new WebSocket(targetUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        console.log('[ReturnsSyncSocket] Connected to WebSocket at', targetUrl);
        this.send({ type: 'REQUEST_SYNC' });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: ReturnSyncMessage = JSON.parse(event.data);
          this.notifyListeners(message);
        } catch (err) {
          console.error('[ReturnsSyncSocket] Error parsing WS message:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.ws = null;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
        if (this.ws) {
          try {
            this.ws.close();
          } catch {}
        }
        this.scheduleReconnect();
      };
    } catch {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.currentUrlIndex = (this.currentUrlIndex + 1) % (this.candidateUrls.length || 1);
      this.connect();
    }, 4000);
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(message: ReturnSyncMessage) {
    this.listeners.forEach((listener) => {
      try {
        listener(message);
      } catch (err) {
        console.error('[ReturnsSyncSocket] Error in listener:', err);
      }
    });
  }

  public send(message: ReturnSyncMessage) {
    // 1. Post to local BroadcastChannel for instant zero-latency same-browser cross-tab sync
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          senderId: this.clientId,
          message,
        });
      } catch (err) {
        console.warn('[ReturnsSyncSocket] Failed to post to BroadcastChannel:', err);
      }
    }

    // 2. Transmit to remote WebSocket if open
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (err) {
        console.error('[ReturnsSyncSocket] Failed to send over WebSocket:', err);
      }
    }
  }
}

export const returnsSyncSocket = new ReturnsSyncSocketService();
