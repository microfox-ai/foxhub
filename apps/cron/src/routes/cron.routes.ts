import { Router, Request, Response } from 'express';
import CronManager from '../lib/cron-manager';
import LogService from '../lib/log-service';
import { ApiResponse } from '../types/cron.types';

const router = Router();

// Singleton cron manager instance
let cronManager: CronManager | null = null;

/**
 * Initialize cron manager if not already initialized
 */
const ensureCronManager = async (): Promise<CronManager> => {
  if (!cronManager) {
    cronManager = new CronManager();
    await cronManager.initialize();
    cronManager.start();
    LogService.log('info', 'Cron manager initialized and started');
  }
  return cronManager;
};

/**
 * Create API response helper
 */
const createResponse = <T>(data: T, success: boolean = true, error?: string): ApiResponse<T> => ({
  success,
  data: success ? data : undefined,
  error: error,
  timestamp: new Date().toISOString()
});

/**
 * GET /status - Get service status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const manager = await ensureCronManager();
    const status = manager.getStatus();
    res.json(createResponse(status));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    LogService.log('error', 'Error getting status', { error: errorMsg });
    res.status(500).json(createResponse(null, false, errorMsg));
  }
});

/**
 * GET /health - Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const manager = await ensureCronManager();
    const health = manager.healthCheck();
    res.status(health.status === 'healthy' ? 200 : 503).json(createResponse(health));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    LogService.log('error', 'Health check failed', { error: errorMsg });
    res.status(503).json(createResponse(
      { status: 'unhealthy', details: { error: errorMsg } },
      false
    ));
  }
});

/**
 * GET /jobs - Get all jobs
 */
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const manager = await ensureCronManager();
    const service = manager.getService();
    const jobs = service.getAllJobs();
    res.json(createResponse(jobs));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    LogService.log('error', 'Error getting jobs', { error: errorMsg });
    res.status(500).json(createResponse(null, false, errorMsg));
  }
});

/**
 * GET /jobs/:jobId - Get specific job status
 */
router.get('/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const manager = await ensureCronManager();
    const service = manager.getService();
    const jobStatus = service.getJobStatus(req.params.jobId);
    res.json(createResponse(jobStatus));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    LogService.log('error', `Error getting job status for ${req.params.jobId}`, { error: errorMsg });
    res.status(500).json(createResponse(null, false, errorMsg));
  }
});

/**
 * GET /trigger/:jobId - Trigger a cron job manually
 * GET /trigger/:jobId?index=0 - Trigger by index
 */
router.get('/trigger/:jobId?', async (req: Request, res: Response): Promise<void> => {
  try {
    const manager = await ensureCronManager();
    const service = manager.getService();
    const { jobId } = req.params;
    const { index } = req.query;

    let targetJobId: string;

    if (jobId && jobId !== 'undefined') {
      targetJobId = jobId;
    } else if (index !== undefined) {
      targetJobId = `cron-job-${index}`;
    } else {
      const errorMsg = 'Either jobId parameter or index query parameter must be provided';
      LogService.log('warn', 'Trigger attempt without proper parameters', { jobId, index });
      res.status(400).json(createResponse(null, false, errorMsg));
      return;
    }

    const executionId = await service.triggerJob(targetJobId);
    LogService.log('info', `Job ${targetJobId} triggered manually`, { executionId, triggeredBy: 'GET' });
    
    res.json(createResponse({
      message: `Job ${targetJobId} triggered successfully`,
      executionId,
      jobId: targetJobId
    }));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    LogService.log('error', 'Error triggering job', { error: errorMsg, params: req.params, query: req.query });
    res.status(500).json(createResponse(null, false, errorMsg));
  }
});

/**
 * GET /start - Start all jobs
 * GET /start/:jobId - Start specific job
 */
router.get('/start/:jobId?', async (req: Request, res: Response): Promise<void> => {
  try {
    const manager = await ensureCronManager();
    const service = manager.getService();
    const { jobId } = req.params;

    let result: any = {};

    if (jobId && jobId !== 'undefined') {
      result.success = service.startJob(jobId);
      result.message = `Job ${jobId} ${result.success ? 'started' : 'failed to start'}`;
      LogService.log('info', `Job ${jobId} start attempt`, { success: result.success });
    } else {
      service.startAllJobs();
      result.success = true;
      result.message = 'All jobs started';
      LogService.log('info', 'All jobs started via GET request');
    }

    const status = manager.getStatus();
    res.json(createResponse({ ...result, status }));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    LogService.log('error', 'Error starting jobs', { error: errorMsg, jobId: req.params.jobId });
    res.status(500).json(createResponse(null, false, errorMsg));
  }
});

/**
 * GET /stop - Stop all jobs
 * GET /stop/:jobId - Stop specific job
 */
router.get('/stop/:jobId?', async (req: Request, res: Response): Promise<void> => {
  try {
    const manager = await ensureCronManager();
    const service = manager.getService();
    const { jobId } = req.params;

    let result: any = {};

    if (jobId && jobId !== 'undefined') {
      result.success = service.stopJob(jobId);
      result.message = `Job ${jobId} ${result.success ? 'stopped' : 'failed to stop'}`;
      LogService.log('info', `Job ${jobId} stop attempt`, { success: result.success });
    } else {
      service.stopAllJobs();
      result.success = true;
      result.message = 'All jobs stopped';
      LogService.log('info', 'All jobs stopped via GET request');
    }

    const status = manager.getStatus();
    res.json(createResponse({ ...result, status }));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    LogService.log('error', 'Error stopping jobs', { error: errorMsg, jobId: req.params.jobId });
    res.status(500).json(createResponse(null, false, errorMsg));
  }
});

/**
 * GET /reload - Reload configuration
 */
router.get('/reload', async (req: Request, res: Response) => {
  try {
    const manager = await ensureCronManager();
    await manager.reload();
    const status = manager.getStatus();
    LogService.log('info', 'Configuration reloaded via GET request');
    res.json(createResponse({
      message: 'Configuration reloaded successfully',
      status
    }));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    LogService.log('error', 'Error reloading configuration', { error: errorMsg });
    res.status(500).json(createResponse(null, false, errorMsg));
  }
});

/**
 * GET /logs - Get recent logs
 * Query parameters:
 * - limit: number of logs to return (default: 100)
 * - level: filter by log level (info, warn, error, debug)
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const { limit, level } = req.query;
    const parsedLimit = limit ? parseInt(limit as string) : 100;
    const logs = LogService.getLogs(parsedLimit, level as any);
    const stats = LogService.getLogStats();
    
    res.json(createResponse({
      logs,
      stats,
      filters: { limit: parsedLimit, level: level || 'all' },
      logFilePath: LogService.getLogFilePath()
    }));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    LogService.log('error', 'Error retrieving logs', { error: errorMsg });
    res.status(500).json(createResponse(null, false, errorMsg));
  }
});

/**
 * GET /logs/cleanup - Manual log cleanup (also used by cron job)
 */
router.get('/logs/cleanup', async (req: Request, res: Response) => {
  try {
    const result = LogService.cleanupLogs();
    LogService.log('info', 'Manual log cleanup performed', result);
    
    res.json(createResponse({
      message: 'Log cleanup completed',
      ...result
    }));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    LogService.log('error', 'Error during log cleanup', { error: errorMsg });
    res.status(500).json(createResponse(null, false, errorMsg));
  }
});

/**
 * GET /logs/clear - Clear all logs
 */
router.get('/logs/clear', async (req: Request, res: Response) => {
  try {
    LogService.clearLogs();
    LogService.log('info', 'All logs cleared via GET request');
    
    res.json(createResponse({
      message: 'All logs cleared successfully'
    }));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json(createResponse(null, false, errorMsg));
  }
});

// Cleanup on process termination
process.on('SIGTERM', async () => {
  LogService.log('info', 'SIGTERM received, shutting down gracefully');
  if (cronManager) {
    await cronManager.shutdown();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  LogService.log('info', 'SIGINT received, shutting down gracefully');
  if (cronManager) {
    await cronManager.shutdown();
  }
  process.exit(0);
});

export default router; 