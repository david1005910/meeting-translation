import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth.routes';
import meetingRoutes from './routes/meetings.routes';
import audioRoutes from './routes/audio.routes';
import settingsRoutes from './routes/settings.routes';
import { errorMiddleware } from './middleware/error.middleware';

const app = express();

// Simple request logger
app.use((req, _res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/meetings', audioRoutes);
app.use('/api/settings', settingsRoutes);

app.use(errorMiddleware);

export default app;
