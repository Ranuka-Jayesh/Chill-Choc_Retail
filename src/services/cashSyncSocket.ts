import { CashMovement, CashSession } from '@/types';

export type CashSyncMessage =
  | { type: 'DRAWER_OPENED'; payload: { session: CashSession; movements?: CashMovement[] } }
  | { type: 'DRAWER_CLOSED'; payload: { session: CashSession } }
  | { type: 'CASH_MOVEMENT'; payload: { movement: CashMovement; session: CashSession } }
  | { type: 'CASH_SALE'; payload: { amount: number; session: CashSession } }
  | { type: 'CASH_REFUND'; payload: { amount: number; session: CashSession } }
  | { type: 'SYNC_CASH_STATE'; payload: { session: CashSession; movements: CashMovement[]; history?: CashSession[] } }
  | { type: 'REQUEST_SYNC' };

type Listener = (event: CashSyncMessage) => void;
type ConnectionListener = (connected: boolean) => void;

class CashSyncSocketService {
  private ws: WebSocket | null = null;
  private listeners: Set<Listener> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private isConnecting: boolean = false;
  private reconnectTimer: any = null;
  private clientId: string = `cash-client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  private candidateUrls: string[] = [];
  private currentUrlIndex: number = 0;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = Infinity;

  constructor() {
    // 1. Setup instant cross-tab BroadcastChannel for zero-latency real-time synchronization
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('chill_choc_cash_sync_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.senderId !== this.clientId) {
            this.notifyListeners(event.data.message);
          }
        };
      } catch (err) {
        console.warn('[CashSyncSocket] BroadcastChannel not supported or blocked:', err);
      }
    }

    // 2. Setup WebSocket candidate URLs
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const customWs = (import.meta as any).env?.VITE_WS_URL;

      if (customWs) {
        this.candidateUrls = [`${customWs}/cash`];
        this.connect();
      } else if (isLocalhost) {
        this.candidateUrls = [
          `ws://${window.location.host}/ws/cash`,
          `ws://localhost:9200/cash`,
          `ws://127.0.0.1:9200/cash`,
        ];
        this.connect();
      } else {
        // In production on HTTPS: Supabase Realtime & native BroadcastChannel provide full real-time syncing.
        // Do not attempt to connect to a local /ws path on production domains unless VITE_WS_URL is explicitly set.
        this.candidateUrls = [];
      }
    }
  }

  public connect() {
    if (
      typeof window === 'undefined' ||
      this.candidateUrls.length === 0 ||
      this.isConnecting ||
      (this.ws && this.ws.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    const targetUrl = this.candidateUrls[this.currentUrlIndex];
    if (!targetUrl) return;
    this.isConnecting = true;

    try {
      this.ws = new WebSocket(targetUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyConnectionListeners(true);
        console.log('[CashSyncSocket] Connected to WebSocket at', targetUrl);
        this.send({ type: 'REQUEST_SYNC' });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: CashSyncMessage = JSON.parse(event.data);
          this.notifyListeners(message);
        } catch (err) {
          console.error('[CashSyncSocket] Error parsing WS message:', err);
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
    if (
      this.candidateUrls.length === 0 ||
      this.reconnectTimer ||
      this.reconnectAttempts >= this.maxReconnectAttempts
    ) {
      return;
    }
    this.reconnectAttempts++;
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
        console.error('[CashSyncSocket] Connection listener error:', e);
      }
    });
  }

  private notifyListeners(message: CashSyncMessage) {
    this.listeners.forEach((listener) => {
      try {
        listener(message);
      } catch (err) {
        console.error('[CashSyncSocket] Error in message listener:', err);
      }
    });
  }

  public send(message: CashSyncMessage) {
    // 1. Post to local BroadcastChannel for instant zero-latency same-browser cross-tab sync
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          senderId: this.clientId,
          message,
        });
      } catch (err) {
        console.warn('[CashSyncSocket] Failed to post to BroadcastChannel:', err);
      }
    }

    // 2. Transmit to remote WebSocket if open
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (err) {
        console.error('[CashSyncSocket] Failed to send over WebSocket:', err);
      }
    }
  }
}

export const cashSyncSocket = new CashSyncSocketService();
