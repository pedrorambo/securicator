import WebSocket, { WebSocketServer } from "ws";

const wss = new WebSocketServer({
  port: 9090,
  clientTracking: true,
  maxPayload: 1024 * 1024,
});

wss.on("connection", function connection(ws) {
  ws.on("error", console.error);

  ws.on("message", function message(data, isBinary) {
    const textContent = data.toString();
    if (textContent.startsWith("CONNECT ")) {
      const publicKey = textContent.split(" ")[1];
      ws.publicKey = publicKey;
      return;
    }

    const destinationPublicKey = textContent.split(" ")[1];

    wss.clients.forEach(function each(client) {
      if (client === ws) return;
      if (client.publicKey !== destinationPublicKey) return;
      console.log(`Message ${data.length}`);
      if (client.readyState === WebSocket.OPEN) {
        client.send(data, { binary: isBinary });
      }
    });
  });
});
