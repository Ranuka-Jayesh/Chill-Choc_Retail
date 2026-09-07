import { Product } from '@/types';

export type ProductSyncMessage =
  | { type: 'PRODUCT_ADDED'; payload: Product }
  | { type: 'PRODUCT_UPDATED'; payload: { id: string; updates: Partial<Product> } }
  | { type: 'PRODUCT_DELETED'; payload: { id: string } }
  | { type: 'PRODUCT_AVAILABILITY_CHANGED'; payload: { id: string; isAvailable: boolean } }
  | { type: 'PRODUCTS_SYNC_ALL'; payload: Product[] }
  | { type: 'REQUEST_SYNC' };

type Listener = (event: ProductSyncMessage) => void;

class ProductSyncSocketService {
  private ws: WebSocket | null = null;
  private listeners: Set<Listener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private isConnecting: boolean = false;
  private reconnectTimer: any = null;
  private url: string = '';
  private clientId: string = `client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  constructor() {
    // 1. Setup instant cross-tab BroadcastChannel (supported natively in modern browsers)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('chill_choc_products_sync_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.senderId !== this.clientId) {
            this.notifyListeners(event.data.message);
          }
        };
      } catch (err) {
        console.warn('[ProductSyncSocket] BroadcastChannel not supported or blocked:', err);
      }
    }

    // 2. Determine WebSocket URLs (primary: integrated /ws/products, fallback: standalone port 9200)
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      this.candidateUrls = [
        `${protocol}//${window.location.host}/ws/products`,
        `ws://localhost:9200`,
        `ws://127.0.0.1:9200`,
      ];
      this.connect();
    }
  }

  private candidateUrls: string[] = [];
  private currentUrlIndex: number = 0;

  public connect() {
    if (typeof window === 'undefined' || this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    const targetUrl = this.candidateUrls[this.currentUrlIndex] || `ws://${window.location.host}/ws/products`;
    this.isConnecting = true;

    try {
      this.ws = new WebSocket(targetUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        console.log('[ProductSyncSocket] Connected to WebSocket at', targetUrl);
        // Request latest synchronized state upon connection
        this.send({ type: 'REQUEST_SYNC' });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: ProductSyncMessage = JSON.parse(event.data);
          this.notifyListeners(message);
        } catch (err) {
          console.error('[ProductSyncSocket] Error parsing WS message:', err);
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
    } catch (err) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.candidateUrls.length > 0) {
        this.currentUrlIndex = (this.currentUrlIndex + 1) % this.candidateUrls.length;
      }
      this.connect();
    }, 2000);
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(message: ProductSyncMessage) {
    for (const listener of this.listeners) {
      try {
        listener(message);
      } catch (err) {
        console.error('[ProductSyncSocket] Listener error:', err);
      }
    }
  }

  private send(message: ProductSyncMessage) {
    const raw = JSON.stringify(message);

    // Send via WebSocket if open
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(raw);
      } catch (err) {
        console.warn('[ProductSyncSocket] Failed to send via WS:', err);
      }
    }

    // Always mirror to local BroadcastChannel for instant zero-latency same-browser sync
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          senderId: this.clientId,
          message,
        });
      } catch (err) {
        console.warn('[ProductSyncSocket] Failed to post to BroadcastChannel:', err);
      }
    }
  }

  public broadcastAdd(product: Product) {
    this.send({ type: 'PRODUCT_ADDED', payload: product });
  }

  public broadcastUpdate(id: string, updates: Partial<Product>) {
    this.send({ type: 'PRODUCT_UPDATED', payload: { id, updates } });
  }

  public broadcastDelete(id: string) {
    this.send({ type: 'PRODUCT_DELETED', payload: { id } });
  }

  public broadcastAvailability(id: string, isAvailable: boolean) {
    this.send({ type: 'PRODUCT_AVAILABILITY_CHANGED', payload: { id, isAvailable } });
  }

  public broadcastSyncAll(products: Product[]) {
    this.send({ type: 'PRODUCTS_SYNC_ALL', payload: products });
  }

  public isConnected(): boolean {
    return Boolean(this.ws && this.ws.readyState === WebSocket.OPEN);
  }
}

export const productSyncSocket = new ProductSyncSocketService();
