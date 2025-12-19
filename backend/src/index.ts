
import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import apiRouter from './routes/index.js';
import { initSocket } from './socket.js';
import { listenerManager } from './services/listenerManager.js';

console.log('All initial imports successful');

dotenv.config();

const app: Express = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3001;

// Initialize Socket.IO
initSocket(httpServer);

app.use(cors({
  origin: '*'
}));
app.use(express.json());

app.use('/api/v1', apiRouter);

app.get('/', (req: Request, res: Response) => {
  res.send('Imperium C2 Backend Server is running');
});

httpServer.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
  // Start listeners
  listenerManager.startAll();
});
