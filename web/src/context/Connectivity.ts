export class Connectivity {
  myGlobalPublicKey: string;
  _socket: any;
  messageHandler: any;

  constructor(myGlobalPublicKey: any) {
    this.myGlobalPublicKey = myGlobalPublicKey;
    this.connect();
  }

  connect() {
    this._socket = new WebSocket("ws://localhost:9090", "protocolOne");
    if (this.messageHandler) {
      this._socket.onmessage = (event: any) => this.messageHandler(event.data);
    }
    this._socket.onopen = () =>
      this._socket.send(`CONNECT ${this.myGlobalPublicKey}`);
    this._socket.onclose = (e: any) => {
      console.log(
        "Socket is closed. Reconnect will be attempted in 1 second.",
        e.reason
      );
      setTimeout(() => {
        this.connect();
      }, 1000);
    };
  }

  async getIsConnected() {
    return this._socket.readyState === WebSocket.OPEN;
  }

  async send(message: any) {
    try {
      this._socket.send(message);
    } catch (error) {
      console.error(error);
    }
  }

  onMessage(receiverCallback: any) {
    this.messageHandler = receiverCallback;
    this._socket.onmessage = (event: any) => receiverCallback(event.data);
  }
}
