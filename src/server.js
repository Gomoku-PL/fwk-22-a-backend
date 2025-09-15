import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupSocket } from './socket/socketHandler.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

setupSocket(io);

const PORT = 4000;
server.listen(PORT, () =>
  console.log(` Server is running on http://localhost:${PORT}`)
);
