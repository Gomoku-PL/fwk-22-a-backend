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

<<<<<<< HEAD
// Plug in the socket logic
setupSocket(io);

const PORT = 4000;
server.listen(PORT, () =>
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
);
=======
app.use(express.json()); 

const gamesRoutes = require('./routes/games.routes'); 
app.use('/', gamesRoutes); 

>>>>>>> 5ddd8dd1c785821f03df27898f3a4e2d0832e3d0
