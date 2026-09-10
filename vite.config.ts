import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { WebSocketServer, WebSocket } from 'ws'

function posWebSocketSyncPlugin(): Plugin {
  let productsWss: WebSocketServer | null = null;
  let returnsWss: WebSocketServer | null = null;
  let cashWss: WebSocketServer | null = null;
  let operatorsWss: WebSocketServer | null = null;

  let cachedProducts: any[] | null = null;
  let cachedReturns: any[] | null = null;
  let cachedCashState: { session: any; movements: any[]; history: any[] } | null = null;
  let cachedOperators: any[] | null = null;

  return {
    name: 'pos-websocket-sync',
    configureServer(server) {
      if (!server.httpServer) return;

      productsWss = new WebSocketServer({ noServer: true });
      returnsWss = new WebSocketServer({ noServer: true });
      cashWss = new WebSocketServer({ noServer: true });
      operatorsWss = new WebSocketServer({ noServer: true });

      server.httpServer.on('upgrade', (request, socket, head) => {
        const pathname = new URL(request.url || '', 'http://localhost').pathname;
        if (pathname === '/ws/products') {
          productsWss!.handleUpgrade(request, socket, head, (ws) => {
            productsWss!.emit('connection', ws, request);
          });
        } else if (pathname === '/ws/returns') {
          returnsWss!.handleUpgrade(request, socket, head, (ws) => {
            returnsWss!.emit('connection', ws, request);
          });
        } else if (pathname === '/ws/cash') {
          cashWss!.handleUpgrade(request, socket, head, (ws) => {
            cashWss!.emit('connection', ws, request);
          });
        } else if (pathname === '/ws/operators') {
          operatorsWss!.handleUpgrade(request, socket, head, (ws) => {
            operatorsWss!.emit('connection', ws, request);
          });
        }
      });

      // 1. Products WebSocket connection
      productsWss.on('connection', (ws) => {
        console.log(`[POS-WS Products] Client connected. Active: ${productsWss!.clients.size}`);

        if (cachedProducts && cachedProducts.length > 0) {
          try {
            ws.send(JSON.stringify({ type: 'PRODUCTS_SYNC_ALL', payload: cachedProducts }));
          } catch (e) {
            console.error('[POS-WS Products] Initial sync error:', e);
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
            }

            for (const client of productsWss!.clients) {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(raw);
              }
            }
          } catch (e) {
            console.error('[POS-WS Products] Message error:', e);
          }
        });
      });

      const isDummyRet = (r: any) => {
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

      // 2. Returns & Refunds WebSocket connection
      returnsWss.on('connection', (ws) => {
        console.log(`[POS-WS Returns] Client connected. Active: ${returnsWss!.clients.size}`);

        if (cachedReturns && cachedReturns.length > 0) {
          cachedReturns = cachedReturns.filter((r: any) => !isDummyRet(r));
          if (cachedReturns.length > 0) {
            try {
              ws.send(JSON.stringify({ type: 'SYNC_RETURNS', payload: cachedReturns }));
            } catch (e) {
              console.error('[POS-WS Returns] Initial sync error:', e);
            }
          }
        }

        ws.on('message', (data) => {
          try {
            const raw = data.toString();
            const message = JSON.parse(raw);

            if (message.type === 'SYNC_RETURNS' && Array.isArray(message.payload)) {
              cachedReturns = message.payload.filter((r: any) => !isDummyRet(r));
            } else if (message.type === 'RETURN_REQUESTED' && message.payload && !isDummyRet(message.payload)) {
              if (!cachedReturns) cachedReturns = [];
              if (!cachedReturns.some((r: any) => r.id === message.payload.id || r.returnCode === message.payload.returnCode)) {
                cachedReturns.unshift(message.payload);
              }
            } else if (message.type === 'RETURN_APPROVED' && message.payload) {
              if (cachedReturns) {
                cachedReturns = cachedReturns.map((r: any) =>
                  r.id === message.payload.id ? { ...r, status: 'Approved', reviewNotes: message.payload.notes } : r
                );
              }
            } else if (message.type === 'RETURN_REJECTED' && message.payload) {
              if (cachedReturns) {
                cachedReturns = cachedReturns.map((r: any) =>
                  r.id === message.payload.id ? { ...r, status: 'Rejected', reviewNotes: message.payload.notes } : r
                );
              }
            }

            for (const client of returnsWss!.clients) {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(raw);
              }
            }
          } catch (e) {
            console.error('[POS-WS Returns] Message error:', e);
          }
        });

        ws.on('close', () => {
          console.log(`[POS-WS Returns] Client disconnected. Remaining: ${returnsWss!.clients.size}`);
        });
      });

      // 3. Cash Drawer & Audits WebSocket connection
      cashWss.on('connection', (ws) => {
        console.log(`[POS-WS Cash] Client connected. Active: ${cashWss!.clients.size}`);

        if (cachedCashState && (cachedCashState.session || (Array.isArray(cachedCashState.movements) && cachedCashState.movements.length > 0))) {
          try {
            ws.send(JSON.stringify({ type: 'SYNC_CASH_STATE', payload: cachedCashState }));
          } catch (e) {
            console.error('[POS-WS Cash] Initial sync error:', e);
          }
        }

        ws.on('message', (data) => {
          try {
            const raw = data.toString();
            const message = JSON.parse(raw);

            if (!cachedCashState) {
              cachedCashState = { session: null, movements: [], history: [] };
            }

            if (message.type === 'SYNC_CASH_STATE' && message.payload) {
              cachedCashState = {
                session: message.payload.session || cachedCashState.session,
                movements: Array.isArray(message.payload.movements) ? message.payload.movements : cachedCashState.movements,
                history: Array.isArray(message.payload.history) ? message.payload.history : cachedCashState.history,
              };
            } else if (message.type === 'DRAWER_OPENED' && message.payload) {
              cachedCashState.session = message.payload.session;
              if (Array.isArray(message.payload.movements)) {
                cachedCashState.movements = message.payload.movements;
              }
            } else if (message.type === 'DRAWER_CLOSED' && message.payload) {
              cachedCashState.session = message.payload.session;
              if (message.payload.session) {
                if (!cachedCashState.history) cachedCashState.history = [];
                cachedCashState.history.unshift(message.payload.session);
              }
            } else if (message.type === 'CASH_MOVEMENT' && message.payload) {
              if (message.payload.session) {
                cachedCashState.session = message.payload.session;
              }
              if (message.payload.movement) {
                if (!cachedCashState.movements) cachedCashState.movements = [];
                // Check duplicate
                if (!cachedCashState.movements.some((m: any) => m.id === message.payload.movement.id)) {
                  cachedCashState.movements.unshift(message.payload.movement);
                }
              }
            } else if ((message.type === 'CASH_SALE' || message.type === 'CASH_REFUND') && message.payload) {
              if (message.payload.session) {
                cachedCashState.session = message.payload.session;
              }
            } else if (message.type === 'REQUEST_SYNC' && cachedCashState && cachedCashState.session) {
              ws.send(JSON.stringify({ type: 'SYNC_CASH_STATE', payload: cachedCashState }));
            }

            // Broadcast to all other connected clients
            for (const client of cashWss!.clients) {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(raw);
              }
            }
          } catch (e) {
            console.error('[POS-WS Cash] Message error:', e);
          }
        });

        ws.on('close', () => {
          console.log(`[POS-WS Cash] Client disconnected. Remaining: ${cashWss!.clients.size}`);
        });
      });

      // 4. Staff & Terminal Operators WebSocket connection
      operatorsWss.on('connection', (ws) => {
        console.log(`[POS-WS Operators] Client connected. Active: ${operatorsWss!.clients.size}`);

        if (cachedOperators && Array.isArray(cachedOperators)) {
          try {
            ws.send(JSON.stringify({ type: 'SYNC_OPERATORS', payload: cachedOperators }));
          } catch (e) {
            console.error('[POS-WS Operators] Initial sync error:', e);
          }
        }

        ws.on('message', (data) => {
          try {
            const raw = data.toString();
            const message = JSON.parse(raw);

            if (!cachedOperators) {
              cachedOperators = [];
            }

            if (message.type === 'SYNC_OPERATORS' && Array.isArray(message.payload)) {
              cachedOperators = message.payload;
            } else if (message.type === 'OPERATOR_STATUS_CHANGED' && message.payload) {
              const { id, status } = message.payload;
              cachedOperators = cachedOperators.map((op: any) =>
                op.id === id ? { ...op, status } : op
              );
            } else if (message.type === 'OPERATOR_CREATED' && message.payload) {
              if (!cachedOperators.some((op: any) => op.id === message.payload.id)) {
                cachedOperators.push(message.payload);
              }
            } else if (message.type === 'OPERATOR_UPDATED' && message.payload) {
              cachedOperators = cachedOperators.map((op: any) =>
                op.id === message.payload.id ? { ...op, ...message.payload } : op
              );
            } else if (message.type === 'OPERATOR_DELETED' && message.payload) {
              cachedOperators = cachedOperators.filter((op: any) => op.id !== message.payload.id);
            } else if (message.type === 'REQUEST_SYNC' && cachedOperators && cachedOperators.length > 0) {
              ws.send(JSON.stringify({ type: 'SYNC_OPERATORS', payload: cachedOperators }));
            }

            // Broadcast to all other connected clients
            for (const client of operatorsWss!.clients) {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(raw);
              }
            }
          } catch (e) {
            console.error('[POS-WS Operators] Message error:', e);
          }
        });

        ws.on('close', () => {
          console.log(`[POS-WS Operators] Client disconnected. Remaining: ${operatorsWss!.clients.size}`);
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
