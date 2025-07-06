import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cronRoutes from './routes/cron.routes';

const app = express();
const PORT = process.env.PORT || 8003;
const NODE_ENV = process.env.NODE_ENV || 'production';

// Middleware
app.use(helmet({
  contentSecurityPolicy: undefined
}));
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint (before authentication)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'foxhub-cron-service',
    version: '1.0.0',
    node: process.version
  });
});

// API routes
app.use('/api/cron', cronRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'FoxHub Cron Service',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /health',
      status: 'GET /api/cron/status',
      jobs: 'GET /api/cron/jobs',
      jobStatus: 'GET /api/cron/jobs/:jobId',
      trigger: 'GET /api/cron/trigger/:jobId or GET /api/cron/trigger?index=0',
      start: 'GET /api/cron/start (all) or GET /api/cron/start/:jobId',
      stop: 'GET /api/cron/stop (all) or GET /api/cron/stop/:jobId',
      reload: 'GET /api/cron/reload',
      logs: 'GET /api/cron/logs?limit=100&level=info',
      logsCleanup: 'GET /api/cron/logs/cleanup',
      logsClear: 'GET /api/cron/logs/clear'
    },
    features: [
      'All routes are GET-based for easy browser/curl access',
      'Built-in logging with auto-cleanup',
      'Concurrent execution support',
      'Vercel.json import support',
      'Real-time monitoring'
    ],
    documentation: 'See README.md for detailed usage instructions'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
🚀 FoxHub Cron Service started successfully!
📍 Server: http://localhost:${PORT}
🌍 Environment: ${NODE_ENV}
📖 Health Check: http://localhost:${PORT}/health
📊 Status API: http://localhost:${PORT}/api/cron/status
📅 Jobs API: http://localhost:${PORT}/api/cron/jobs
⚙️  Control API: http://localhost:${PORT}/api/cron/control
🎯 Trigger API: http://localhost:${PORT}/api/cron/trigger
🔄 Reload API: http://localhost:${PORT}/api/cron/reload
🛑 Shutdown API: http://localhost:${PORT}/api/cron/shutdown

📝 Configuration file: cron.json (repo root)
  `);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('HTTP server closed.');
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

export default app; 