import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/authRoutes.js';
import journalRoutes from './routes/journalRoutes.js';
import geminiRoutes from './routes/geminiRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS & body parsing
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health Check Endpoint for Cloud Run / Smoke Tests
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Dayloom Backend API Server',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes Registration
app.use('/api/user', authRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve static frontend build if present (for single Cloud Run deployment)
const webBuildPath = path.join(__dirname, '../web/dist');
app.use(express.static(webBuildPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(webBuildPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Dayloom API Server Running. Web UI building...');
    }
  });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('[GlobalErrorHandler]', err);
  res.status(err.status || 500).json({
    error: err.name || 'ServerError',
    message: err.message || 'An unexpected error occurred.'
  });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`Dayloom Backend Service listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`====================================================`);
});
