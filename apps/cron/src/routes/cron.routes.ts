import { Router, Request, Response } from 'express';
import CronManager from '../lib/cron-manager';
import { ApiResponse, TriggerJobRequest, ControlJobRequest, UpdateConfigRequest } from '../types/cron.types';

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
    console.error('Error getting status:', error);
    res.status(500).json(createResponse(
      null,
      false,
      error instanceof Error ? error.message : 'Unknown error'
    ));
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
    console.error('Error in health check:', error);
    res.status(503).json(createResponse(
      { status: 'unhealthy', details: { error: error instanceof Error ? error.message : 'Unknown error' } },
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
    console.error('Error getting jobs:', error);
    res.status(500).json(createResponse(
      null,
      false,
      error instanceof Error ? error.message : 'Unknown error'
    ));
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
    console.error('Error getting job status:', error);
    res.status(500).json(createResponse(
      null,
      false,
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

/**
 * POST /trigger - Trigger a cron job manually
 */
router.post('/trigger', async (req: Request, res: Response): Promise<void> => {
  try {
    const manager = await ensureCronManager();
    const service = manager.getService();
    const { jobId, jobIndex }: TriggerJobRequest = req.body;

    let targetJobId: string;

    if (jobId) {
      targetJobId = jobId;
    } else if (typeof jobIndex === 'number') {
      targetJobId = `cron-job-${jobIndex}`;
    } else {
      res.status(400).json(createResponse(
        null,
        false,
        'Either jobId or jobIndex must be provided'
      ));
      return;
    }

    const executionId = await service.triggerJob(targetJobId);
    res.json(createResponse({
      message: `Job ${targetJobId} triggered successfully`,
      executionId,
      jobId: targetJobId
    }));
  } catch (error) {
    console.error('Error triggering job:', error);
    res.status(500).json(createResponse(
      null,
      false,
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

/**
 * POST /control - Control cron jobs (start/stop/restart)
 */
router.post('/control', async (req: Request, res: Response): Promise<void> => {
  try {
    const manager = await ensureCronManager();
    const service = manager.getService();
    const { action, jobId }: ControlJobRequest = req.body;

    let result: any = {};

    switch (action) {
      case 'start':
        if (jobId) {
          result.success = service.startJob(jobId);
          result.message = `Job ${jobId} ${result.success ? 'started' : 'failed to start'}`;
        } else {
          service.startAllJobs();
          result.success = true;
          result.message = 'All jobs started';
        }
        break;

      case 'stop':
        if (jobId) {
          result.success = service.stopJob(jobId);
          result.message = `Job ${jobId} ${result.success ? 'stopped' : 'failed to stop'}`;
        } else {
          service.stopAllJobs();
          result.success = true;
          result.message = 'All jobs stopped';
        }
        break;

      case 'restart':
        if (jobId) {
          service.stopJob(jobId);
          result.success = service.startJob(jobId);
          result.message = `Job ${jobId} ${result.success ? 'restarted' : 'failed to restart'}`;
        } else {
          await manager.reload();
          result.success = true;
          result.message = 'Service reloaded and all jobs restarted';
        }
        break;

      default:
        res.status(400).json(createResponse(
          null,
          false,
          'Invalid action. Use: start, stop, or restart'
        ));
        return;
    }

    const status = manager.getStatus();
    res.json(createResponse({ ...result, status }));
  } catch (error) {
    console.error('Error controlling jobs:', error);
    res.status(500).json(createResponse(
      null,
      false,
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

/**
 * POST /reload - Reload configuration
 */
router.post('/reload', async (req: Request, res: Response) => {
  try {
    const manager = await ensureCronManager();
    await manager.reload();
    const status = manager.getStatus();
    res.json(createResponse({
      message: 'Configuration reloaded successfully',
      status
    }));
  } catch (error) {
    console.error('Error reloading configuration:', error);
    res.status(500).json(createResponse(
      null,
      false,
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

/**
 * PUT /config - Update configuration
 */
router.put('/config', async (req: Request, res: Response) => {
  try {
    const manager = await ensureCronManager();
    const { jobId, endpointUrl, settings }: UpdateConfigRequest = req.body;

    if (endpointUrl && jobId) {
      manager.updateJobEndpointUrl(jobId, endpointUrl);
    }

    const status = manager.getStatus();
    res.json(createResponse({
      message: 'Configuration updated successfully',
      status
    }));
  } catch (error) {
    console.error('Error updating configuration:', error);
    res.status(500).json(createResponse(
      null,
      false,
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

/**
 * POST /shutdown - Graceful shutdown
 */
router.post('/shutdown', async (req: Request, res: Response) => {
  try {
    if (cronManager) {
      await cronManager.shutdown();
      cronManager = null;
    }
    res.json(createResponse({
      message: 'Service shutdown successfully'
    }));
    
    // Give response time to send before actually shutting down
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  } catch (error) {
    console.error('Error during shutdown:', error);
    res.status(500).json(createResponse(
      null,
      false,
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

// Cleanup on process termination
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  if (cronManager) {
    await cronManager.shutdown();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  if (cronManager) {
    await cronManager.shutdown();
  }
  process.exit(0);
});

export default router; 