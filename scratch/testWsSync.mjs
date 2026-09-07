import WebSocket from 'ws';

const wsClient1 = new WebSocket('ws://localhost:9200');
const wsClient2 = new WebSocket('ws://localhost:9200');

let client2Received = false;

wsClient2.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('Client 2 received message:', msg);
  if (msg.type === 'PRODUCT_AVAILABILITY_CHANGED' && msg.payload.id === 'prod-kitkat' && msg.payload.isAvailable === false) {
    client2Received = true;
    console.log('TEST PASSED: Real-time WebSocket synchronization confirmed!');
    wsClient1.close();
    wsClient2.close();
    process.exit(0);
  }
});

wsClient1.on('open', () => {
  console.log('Client 1 connected');
  // Wait a moment for client 2 to connect, then send availability change
  setTimeout(() => {
    console.log('Client 1 broadcasting availability change...');
    wsClient1.send(JSON.stringify({
      type: 'PRODUCT_AVAILABILITY_CHANGED',
      payload: { id: 'prod-kitkat', isAvailable: false }
    }));
  }, 500);
});

wsClient2.on('open', () => {
  console.log('Client 2 connected');
});

setTimeout(() => {
  if (!client2Received) {
    console.error('TEST TIMEOUT: Client 2 did not receive the event');
    process.exit(1);
  }
}, 4000);
