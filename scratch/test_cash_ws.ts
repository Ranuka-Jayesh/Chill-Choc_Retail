import { WebSocket } from 'ws';

async function runTest() {
  console.log('Testing WebSocket cash drawer synchronization...');

  // Connect Client 1 (representing Admin)
  const adminWs = new WebSocket('ws://localhost:5173/ws/cash');

  await new Promise<void>((resolve, reject) => {
    adminWs.on('open', () => {
      console.log('✓ Admin WS connected to /ws/cash');
      resolve();
    });
    adminWs.on('error', (e) => {
      console.error('Admin WS connection error:', e);
      reject(e);
    });
  });

  // Connect Client 2 (representing Cashier)
  const cashierWs = new WebSocket('ws://localhost:5173/ws/cash');

  await new Promise<void>((resolve, reject) => {
    cashierWs.on('open', () => {
      console.log('✓ Cashier WS connected to /ws/cash');
      resolve();
    });
    cashierWs.on('error', (e) => {
      console.error('Cashier WS connection error:', e);
      reject(e);
    });
  });

  // Setup promise for Admin receiving expense movement
  const receivedExpensePromise = new Promise<any>((resolve) => {
    adminWs.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      console.log('Admin received message:', msg.type);
      if (msg.type === 'CASH_MOVEMENT' && msg.payload.movement.type === 'Expense') {
        resolve(msg);
      }
    });
  });

  // Cashier sends Expense movement
  console.log('Cashier sending CASH_MOVEMENT (Expense: Rs. 1,500)...');
  cashierWs.send(
    JSON.stringify({
      type: 'CASH_MOVEMENT',
      payload: {
        movement: {
          id: `cm-test-${Date.now()}`,
          type: 'Expense',
          amount: 1500,
          reason: 'Tea & Snacks for Staff',
          timestamp: '10:30 AM',
          cashier: 'Nimal Perera',
          date: '2026-09-08',
        },
        session: {
          cashier: 'Nimal Perera',
          register: 'POS-01',
          startedAt: '09:12 AM',
          businessDate: '08 Sep 2026',
          sessionDate: '2026-09-08',
          openingCash: 16000,
          cashSales: 0,
          cashRefunds: 0,
          cashExpenses: 1500,
          cashIn: 0,
          cashOut: 0,
          expectedCash: 14500,
          isClosed: false,
        },
      },
    })
  );

  const receivedExpense = await receivedExpensePromise;
  console.log('✓ Admin successfully received real-time expense:', receivedExpense.payload.movement.reason, 'Amount:', receivedExpense.payload.movement.amount);

  // Setup promise for Admin receiving Drawer Closed event
  const receivedClosePromise = new Promise<any>((resolve) => {
    adminWs.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'DRAWER_CLOSED') {
        resolve(msg);
      }
    });
  });

  // Cashier sends Drawer Closed event
  console.log('Cashier sending DRAWER_CLOSED...');
  cashierWs.send(
    JSON.stringify({
      type: 'DRAWER_CLOSED',
      payload: {
        session: {
          cashier: 'Nimal Perera',
          register: 'POS-01',
          startedAt: '09:12 AM',
          closedAt: '06:00 PM',
          businessDate: '08 Sep 2026',
          sessionDate: '2026-09-08',
          openingCash: 16000,
          cashSales: 5000,
          cashRefunds: 0,
          cashExpenses: 1500,
          cashIn: 0,
          cashOut: 0,
          expectedCash: 19500,
          countedCash: 19500,
          difference: 0,
          isClosed: true,
        },
      },
    })
  );

  const receivedClose = await receivedClosePromise;
  console.log('✓ Admin successfully received real-time drawer close event. Counted:', receivedClose.payload.session.countedCash, 'Difference:', receivedClose.payload.session.difference);

  adminWs.close();
  cashierWs.close();
  console.log('🎉 All WebSocket real-time cash tests PASSED perfectly!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
