import express from 'express';
import cookieParser from 'cookie-parser';
import apiRoutes from '../server/routes';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use('/api', apiRoutes);

export default function handler(req: any, res: any) {
  return app(req, res);
}