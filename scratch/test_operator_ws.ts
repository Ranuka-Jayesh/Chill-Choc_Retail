import WebSocket from 'ws';

async function testOperatorWebSocket() {
  console.log('--- Starting Staff & Terminal Operators WebSocket Integration Test ---');

  const ws1 = new WebSocket('ws://localhost:5173/ws/operators');
  const ws2 = new WebSocket('ws://localhost:5173/ws/operators');

  await Promise.all([
    new Promise((resolve) => ws1.on('open', resolve)),
    new Promise((resolve) => ws2.on('open', resolve)),
  ]);

  console.log('✓ Both client 1 (Admin) and client 2 (Cashier Terminal) connected to /ws/operators');

  // Test 1: Request sync
  const syncPromise = new Promise<any>((resolve) => {
    ws1.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'SYNC_OPERATORS') {
          resolve(msg.payload);
        }
      } catch {}
    });
  });

  ws1.send(JSON.stringify({ type: 'REQUEST_SYNC' }));

  // Test 2: Admin blocks cashier via WebSocket
  const blockReceivedPromise = new Promise<any>((resolve) => {
    ws2.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'OPERATOR_STATUS_CHANGED' && msg.payload.status === 'Blocked') {
          resolve(msg.payload);
        }
      } catch {}
    });
  });

  console.log('Sending OPERATOR_STATUS_CHANGED (Blocked) from Admin...');
  ws1.send(
    JSON.stringify({
      type: 'OPERATOR_STATUS_CHANGED',
      payload: {
        id: 'op-cashier-1',
        name: 'Nimal Perera',
        handle: '@cashier',
        role: 'CASHIER',
        status: 'Blocked',
      },
    })
  );

  const blockPayload = await blockReceivedPromise;
  console.log('✓ Cashier terminal client 2 received real-time block event:', blockPayload);

  // Test 3: Admin unblocks cashier via WebSocket
  const unblockReceivedPromise = new Promise<any>((resolve) => {
    ws2.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'OPERATOR_STATUS_CHANGED' && msg.payload.status === 'Active') {
          resolve(msg.payload);
        }
      } catch {}
    });
  });

  console.log('Sending OPERATOR_STATUS_CHANGED (Active) from Admin...');
  ws1.send(
    JSON.stringify({
      type: 'OPERATOR_STATUS_CHANGED',
      payload: {
        id: 'op-cashier-1',
        name: 'Nimal Perera',
        handle: '@cashier',
        role: 'CASHIER',
        status: 'Active',
      },
    })
  );

  const unblockPayload = await unblockReceivedPromise;
  console.log('✓ Cashier terminal client 2 received real-time unblock event:', unblockPayload);

  ws1.close();
  ws2.close();

  console.log('--- All WebSocket synchronization tests passed successfully! ---');
}

testOperatorWebSocket().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
