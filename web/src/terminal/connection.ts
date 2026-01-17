// WebSocket connection for text terminals

export interface TelnetConnectionCallbacks {
  onConnect: () => void;
  onDisconnect: () => void;
  onError: (msg: string) => void;
  onData: (data: Uint8Array) => void;
}

export class TelnetConnection {
  private ws: WebSocket | null = null;
  private target: string;
  private callbacks: TelnetConnectionCallbacks;

  constructor(target: string, callbacks: TelnetConnectionCallbacks) {
    this.target = target;
    this.callbacks = callbacks;
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  connect(): void {
    this.cleanup();

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const basePath = import.meta.env.BASE_URL || '/';
    this.ws = new WebSocket(`${proto}//${location.host}${basePath}ws/${this.target}`);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      this.callbacks.onConnect();
    };

    this.ws.onmessage = (e) => {
      this.callbacks.onData(new Uint8Array(e.data));
    };

    this.ws.onclose = () => {
      this.callbacks.onDisconnect();
    };

    this.ws.onerror = () => {
      this.callbacks.onError('Connection error');
    };
  }

  disconnect(): void {
    this.cleanup();
  }

  send(data: string | Uint8Array): void {
    if (!this.isConnected || !this.ws) return;

    if (typeof data === 'string') {
      const encoder = new TextEncoder();
      this.ws.send(encoder.encode(data));
    } else {
      this.ws.send(data);
    }
  }

  private cleanup(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
