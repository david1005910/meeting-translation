import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { setupSocketHandlers } from './socket/socketHandler';
import { setIo } from './utils/socket';

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

setIo(io);
setupSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`🚀 MultiMeet 서버 실행 중: http://localhost:${PORT}`);
});
