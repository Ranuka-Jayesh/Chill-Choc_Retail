import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { WebSocketServer, WebSocket } from 'ws'

function posWebSocketSyncPlugin(): Plugin {
  let wss: WebSocketServer | null = null;
  let cachedProducts: any[] | null = null;

  return {
    name: 'pos-websocket-sync',
    configureServer(server) {
      if (!server.httpServer) return;

      wss = new WebSocketServer({ noServer: true });

      server.httpServer.on('upgrade', (request, socket, head) => {
        const pathname = new URL(request.url || '', 'http://localhost').pathname;
        if (pathname === '/ws/products') {
          wss!.handleUpgrade(request, socket, head, (ws) => {
            wss!.emit('connection', ws, request);
          });
        }
      });

      wss.on('connection', (ws) => {
        console.log(`[POS-WS] Client connected. Total active clients: ${wss!.clients.size}`);

        // If server has cached products, send sync-all immediately to the newly connected client
        if (cachedProducts && cachedProducts.length > 0) {
          try {
            ws.send(JSON.stringify({ type: 'PRODUCTS_SYNC_ALL', payload: cachedProducts }));
          } catch (e) {
            console.error('[POS-WS] Failed to send initial sync to client:', e);
          }
        }

        ws.on('message', (data) => {
          try {
            const raw = data.toString();
            const message = JSON.parse(raw);

            // Update cache when full sync event arrives
            if (message.type === 'PRODUCTS_SYNC_ALL' && Array.isArray(message.payload)) {
              cachedProducts = message.payload;
            } else if (message.type === 'REQUEST_SYNC' && cachedProducts && cachedProducts.length > 0) {
              ws.send(JSON.stringify({ type: 'PRODUCTS_SYNC_ALL', payload: cachedProducts }));
            }

            // Relay message to all other connected clients (admin <-> cashier)
            for (const client of wss!.clients) {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(raw);
              }
            }
          } catch (e) {
            console.error('[POS-WS] Message error:', e);
          }
        });

        ws.on('close', () => {
          console.log(`[POS-WS] Client disconnected. Remaining: ${wss!.clients.size}`);
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), posWebSocketSyncPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
