import { SignalingServer } from './SignalingServer.js';
import { DEFAULT_SERVER_PORT } from '@cling-talk/shared';

const PORT = parseInt(process.env['PORT'] || String(DEFAULT_SERVER_PORT), 10);
const server = new SignalingServer(PORT);

server.start().then((actualPort) => {
  console.log(`Cling Talk signaling server listening on ws://localhost:${actualPort}`);
});

process.on('SIGINT', () => {
  server.stop().then(() => process.exit(0));
});
process.on('SIGTERM', () => {
  server.stop().then(() => process.exit(0));
});
