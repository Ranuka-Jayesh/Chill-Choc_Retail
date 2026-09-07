export interface POSPrintAgentOptions {
  /**
   * WebSocket server URL. Defaults to 'ws://127.0.0.1:17891'
   */
  url?: string;
  /**
   * Automatically attempt to reconnect if connection is lost. Defaults to true.
   */
  autoReconnect?: boolean;
  /**
   * Milliseconds between reconnect attempts. Defaults to 3000ms.
   */
  reconnectInterval?: number;
  /**
   * Maximum reconnect attempts before giving up. Defaults to Infinity.
   */
  maxReconnectAttempts?: number;
  /**
   * Default timeout in ms for requests. Defaults to 10000ms.
   */
  timeout?: number;
}

export interface PrintOptions {
  /**
   * RAW command data string (TSPL for labels, ESC/POS for receipts)
   */
  data: string;
  /**
   * Optional custom job identifier for correlation
   */
  jobId?: string;
}

export interface PrintReceiptOptions {
  /**
   * Receipt data: PDF (base64 string or data URL) or RAW ESC/POS
   */
  data: string;
  /**
   * Explicit receipt format. Set to 'pdf' for PDF receipts, or omit for automatic detection.
   */
  format?: 'pdf' | 'raw';
  /**
   * Optional custom job identifier for correlation
   */
  jobId?: string;
}

export interface PrintRawOptions extends PrintOptions {
  /**
   * Destination Windows printer name
   */
  printer: string;
}

export interface AgentStatus {
  status: string;
  version: string;
  printers: {
    label: string;
    receipt: string;
  };
}

export interface PrinterInfo {
  name: string;
  displayName?: string;
  description?: string;
  status?: number;
  isDefault?: boolean;
  portName?: string;
}

export interface PrintersResponse {
  label: string;
  receipt: string;
  all?: PrinterInfo[];
}

export interface PrintResponse {
  id?: string;
  success: boolean;
  action: string;
  status: string;
  error?: string;
  details?: {
    printer?: string;
    [key: string]: unknown;
  };
}

type EventCallback = (...args: any[]) => void;

/**
 * Lightweight browser/React client SDK for POS Print Agent
 */
export class POSPrintAgent {
  private url: string;
  private autoReconnect: boolean;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private timeout: number;

  private ws: WebSocket | null = null;
  private pendingRequests = new Map<string, {
    resolve: (val: any) => void;
    reject: (err: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();

  private eventListeners = new Map<string, Set<EventCallback>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private isExplicitlyClosed = false;

  constructor(options: POSPrintAgentOptions = {}) {
    this.url = options.url || 'ws://127.0.0.1:17891';
    this.autoReconnect = options.autoReconnect !== false;
    this.reconnectInterval = options.reconnectInterval || 3000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || Infinity;
    this.timeout = options.timeout || 10000;
  }

  /**
   * Connect to local POS Print Agent
   */
  public connect(): Promise<void> {
    this.isExplicitlyClosed = false;

    return new Promise((resolve, reject) => {
      try {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
          resolve();
          return;
        }

        this.ws = new WebSocket(this.url);

        const onOpen = () => {
          this.reconnectAttempts = 0;
          this.cleanupPending(new Error('Connection reset'));
          this.emit('connected');
          this.emit('status', { connected: true });
          resolve();
        };

        const onError = (evt: Event) => {
          this.emit('error', evt);
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(new Error(`Failed to connect to POS Print Agent at ${this.url}`));
          }
        };

        this.ws.addEventListener('open', onOpen, { once: true });
        this.ws.addEventListener('error', onError, { once: true });

        this.ws.addEventListener('message', (event) => {
          this.handleIncomingMessage(event.data);
        });

        this.ws.addEventListener('close', (event) => {
          this.cleanupPending(new Error(`Connection closed (${event.code}: ${event.reason || 'No reason'})`));
          this.emit('disconnected', event);
          this.emit('status', { connected: false });

          if (!this.isExplicitlyClosed && this.autoReconnect) {
            this.scheduleReconnect();
          }
        });
      } catch (err: any) {
        reject(new Error(`Failed to initialize WebSocket: ${err.message || String(err)}`));
      }
    });
  }

  /**
   * Disconnect from local POS Print Agent
   */
  public disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.cleanupPending(new Error('Disconnected by client'));
  }

  /**
   * Check if currently connected
   */
  public isConnected(): boolean {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Ping local print agent
   */
  public async ping(): Promise<boolean> {
    const res = await this.sendRequest<{ pong: boolean }>('ping');
    return !!res.pong;
  }

  /**
   * Query status and configured printers
   */
  public async getStatus(): Promise<AgentStatus> {
    const res = await this.sendRequest<AgentStatus>('getStatus');
    return {
      status: res.status,
      version: res.version,
      printers: res.printers,
    };
  }

  /**
   * Query agent version
   */
  public async getVersion(): Promise<string> {
    const res = await this.sendRequest<{ version: string }>('getVersion');
    return res.version;
  }

  /**
   * List installed Windows printers and current assignments
   */
  public async getPrinters(): Promise<PrintersResponse> {
    return await this.sendRequest<PrintersResponse>('getPrinters');
  }

  /**
   * Print RAW TSPL label to configured Label Printer
   */
  public async printLabel(options: PrintOptions): Promise<PrintResponse> {
    if (!options || !options.data) {
      throw new Error('printLabel requires options.data containing TSPL commands');
    }
    return await this.sendRequest<PrintResponse>('printLabel', {
      data: options.data,
      id: options.jobId,
    });
  }

  /**
   * Print PDF or ESC/POS receipt to configured Receipt Printer
   */
  public async printReceipt(options: PrintReceiptOptions): Promise<PrintResponse> {
    if (!options || !options.data) {
      throw new Error('printReceipt requires options.data containing PDF base64 or receipt commands');
    }
    return await this.sendRequest<PrintResponse>('printReceipt', {
      data: options.data,
      format: options.format,
      id: options.jobId,
    });
  }

  /**
   * Print RAW commands to an explicitly named Windows printer
   */
  public async printRaw(options: PrintRawOptions): Promise<PrintResponse> {
    if (!options || !options.data) {
      throw new Error('printRaw requires options.data');
    }
    if (!options.printer) {
      throw new Error('printRaw requires options.printer name');
    }
    return await this.sendRequest<PrintResponse>('printRaw', {
      printer: options.printer,
      data: options.data,
      id: options.jobId,
    });
  }

  /**
   * Event subscription
   */
  public on(event: 'connected' | 'disconnected' | 'error' | 'status', callback: EventCallback): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((cb) => {
        try {
          cb(...args);
        } catch (err) {
          console.error(`POSPrintAgent listener error for event '${event}':`, err);
        }
      });
    }
  }

  private sendRequest<T = any>(action: string, payload: Record<string, any> = {}, timeoutMs?: number): Promise<T> {
    if (!this.isConnected()) {
      return Promise.reject(new Error(`POS Print Agent is not connected. Call connect() first.`));
    }

    const id = payload.id || `pos-req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const effectiveTimeout = timeoutMs || this.timeout;

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`POS Print Agent request '${action}' timed out after ${effectiveTimeout}ms (id: ${id})`));
      }, effectiveTimeout);

      this.pendingRequests.set(id, { resolve, reject, timer });

      try {
        const message = JSON.stringify({
          id,
          action,
          ...payload,
        });
        this.ws!.send(message);
      } catch (err: any) {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(new Error(`Failed to send WebSocket message: ${err.message || String(err)}`));
      }
    });
  }

  private handleIncomingMessage(raw: any): void {
    try {
      const parsed = JSON.parse(typeof raw === 'string' ? raw : raw.toString('utf8'));
      const id = parsed.id;

      if (id && this.pendingRequests.has(id)) {
        const pending = this.pendingRequests.get(id)!;
        clearTimeout(pending.timer);
        this.pendingRequests.delete(id);

        if (parsed.success === false) {
          pending.reject(new Error(parsed.error || `Request failed with action: ${parsed.action}`));
        } else {
          pending.resolve(parsed);
        }
      }
    } catch (err) {
      console.error('POSPrintAgent failed to parse server message:', err);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch {
        // Will retry on next close event if still disconnected
      }
    }, this.reconnectInterval);
  }

  private cleanupPending(error: Error): void {
    for (const [, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }
}
