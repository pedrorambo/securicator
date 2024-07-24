import WebSocket, { WebSocketServer } from "ws";

let queue = [];

const MAX_QUEUE_SIZE = 100000;

const wss = new WebSocketServer({
  port: 9093,
  clientTracking: true,
  maxPayload: 1024 * 1024,
});

// FIXME: Messages were not being delivered in order. Need to add a mutex.
let handlingMessage = false;

wss.on("connection", function connection(ws) {
  ws.on("error", console.error);

  ws.on("message", async function message(data, isBinary) {
    while (handlingMessage) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    try {
      handlingMessage = true;
      const textContent = data.toString();
      if (textContent.startsWith("CONNECT ")) {
        const publicKey = textContent.split(" ")[1];
        ws.publicKey = publicKey;

        const queuedItems = queue.filter((item) => item.to === publicKey);
        queue = queuedItems.filter((item) => item.to !== publicKey);
        console.log("MEESSAGES REMOVED FROM QUEUE ", queue.length);

        for (const item of queuedItems) {
          ws.send(item.data, { binary: data.isBinary });
        }

        return;
      }

      if (textContent.startsWith("PING")) {
        ws.send("PONG");
        return;
      }

      const destinationPublicKey = textContent.split(" ")[1];
      const retentionLevel = textContent.split(" ")[2];

      // TODO: Mutex to ensure order or relayred messaged

      let destionationWasFound = false;

      wss.clients.forEach((client) => {
        if (client === ws) return false;
        if (client.publicKey !== destinationPublicKey) return false;
        if (client.readyState === WebSocket.OPEN) {
          destionationWasFound = true;
          client.send(data, { binary: isBinary });
        }
      });

      if (!destionationWasFound && retentionLevel === "1") {
        console.log("MEESSAGE PUSHED TO QUEUE ", queue.length);
        queue.push({
          from: ws.publicKey,
          to: destinationPublicKey,
          data: data,
          isBinary: isBinary,
        });
        if (queue.length >= MAX_QUEUE_SIZE) {
          queue.shift();
        }
      }
    } finally {
      handlingMessage = false;
    }
  });
});
