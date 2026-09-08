import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

const PORT = process.env.WS_PORT || 9200;
const server = createServer();
const wss = new WebSocketServer({ server });

let cachedProducts = null;
let cachedReturns = null;

const isDummyRet = (r) => {
  if (!r) return false;
  const c = (r.returnCode || '').toUpperCase();
  const inv = (r.invoiceNumber || '').toUpperCase();
  return (
    c === 'RET-000391' ||
    c === 'RET-000390' ||
    c === 'RET-000389' ||
    inv === 'INV-001825' ||
    inv === 'INV-001820' ||
    inv === 'INV-001802'
  );
};

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`[Standalone-WS] Client connected from ${ip}. Total: ${wss.clients.size}`);

  // Send cached products upon connection
  if (cachedProducts && cachedProducts.length > 0) {
    try {
      ws.send(JSON.stringify({ type: 'PRODUCTS_SYNC_ALL', payload: cachedProducts }));
    } catch {}
  }
  if (cachedReturns && cachedReturns.length > 0) {
    cachedReturns = cachedReturns.filter((r) => !isDummyRet(r));
    if (cachedReturns.length > 0) {
      try {
        ws.send(JSON.stringify({ type: 'SYNC_RETURNS', payload: cachedReturns }));
      } catch {}
    }
  }

  ws.on('message', (data) => {
    try {
      const raw = data.toString();
      const message = JSON.parse(raw);

      if (message.type === 'PRODUCTS_SYNC_ALL' && Array.isArray(message.payload)) {
        cachedProducts = message.payload;
      } else if (message.type === 'REQUEST_SYNC' && cachedProducts && cachedProducts.length > 0) {
        ws.send(JSON.stringify({ type: 'PRODUCTS_SYNC_ALL', payload: cachedProducts }));
      } else if (message.type === 'SYNC_RETURNS' && Array.isArray(message.payload)) {
        cachedReturns = message.payload.filter((r) => !isDummyRet(r));
      }

      // Broadcast to all other peers
      for (const client of wss.clients) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(raw);
        }
      }
    } catch (e) {
      console.error('[Standalone-WS] Error processing message:', e);
    }
  });

  ws.on('close', () => {
    console.log(`[Standalone-WS] Client disconnected. Remaining: ${wss.clients.size}`);
  });
});

server.listen(PORT, () => {
  console.log(`[Standalone-WS] Product Real-time Sync Server listening on ws://localhost:${PORT}`);
});
