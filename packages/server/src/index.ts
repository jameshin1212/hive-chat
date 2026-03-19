import { SignalingServer } from './SignalingServer.js';
import { DEFAULT_SERVER_PORT } from '@cling-talk/shared';

const PORT = parseInt(process.env['PORT'] || String(DEFAULT_SERVER_PORT), 10);
const server = new SignalingServer(PORT);

server.start().then((actualPort) => {
  console.log(`Cling Talk signaling server listening on ws://localhost:${actualPort}`);
});

const shutdown = () => {
  console.log('\nShutting down...');
  server.stop().then(() => process.exit(0));
  // Force exit after 2 seconds if graceful shutdown hangs
  setTimeout(() => process.exit(0), 2000).unref();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
