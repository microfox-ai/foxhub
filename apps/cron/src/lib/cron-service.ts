import * as cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { CronJob, CronExecution, CronConfig } from '../types/cron.types';

class CronService {
  private jobs: Map<string, { task: cron.ScheduledTask; isRunning: boolean; job: CronJob }> = new Map();
  private executions: Map<string, CronExecution> = new Map();
  private config: CronConfig;

  constructor(config: CronConfig) {
    this.config = config;
  }

  /**
   * Register a new cron job that allows concurrent executions
   */
  registerJob(job: CronJob): string {
    const task = cron.schedule(
      job.schedule,
      () => {
        // Create a new execution instance for each trigger
        this.executeJob(job);
      },
      {
        timezone: 'UTC'
      }
    );

    // Stop the task initially
    task.stop();

    this.jobs.set(job.id, { task, isRunning: false, job });
    console.log(`✅ Cron job registered: ${job.id} with schedule: ${job.schedule}`);
    
    return job.id;
  }

  /**
   * Execute a job instance - allows multiple concurrent executions
   */
  private async executeJob(job: CronJob): Promise<void> {
    const executionId = uuidv4();
    const execution: CronExecution = {
      id: executionId,
      jobId: job.id,
      startTime: new Date(),
      status: 'running'
    };

    this.executions.set(executionId, execution);
    
    console.log(`🚀 Starting new execution ${executionId} for job ${job.id} at ${execution.startTime.toISOString()}`);
    
    // Execute in a separate "process context" - use Promise to simulate concurrency
    this.runJobExecution(job, execution);
  }

  /**
   * Run job execution in isolation to allow concurrency
   */
  private async runJobExecution(job: CronJob, execution: CronExecution): Promise<void> {
    const controller = new AbortController();
    const timeout = job.timeout || this.config.settings?.defaultTimeout || 300000; // Default 5 minutes
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
      execution.status = 'timeout';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      execution.error = `Execution timed out after ${timeout}ms`;
      
      console.log(`⏰ Execution ${execution.id} timed out after ${timeout}ms`);
      this.cleanupExecution(execution.id);
    }, timeout);

    try {
      // Make HTTP request to the cron endpoint URL
      const response = await fetch(job.endpointUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Cron-Execution-Id': execution.id,
          'X-Cron-Job-Id': job.id,
          'User-Agent': 'FoxHub-CronService/1.0',
          // Same header Vercel Cron sends, checked by apps/web/app/api/cron/auth.ts
          ...(process.env.CRON_SECRET && { Authorization: `Bearer ${process.env.CRON_SECRET}` })
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      if (response.ok) {
        execution.status = 'completed';
        console.log(`✅ Execution ${execution.id} completed successfully in ${execution.duration}ms`);
      } else {
        execution.status = 'failed';
        execution.error = `HTTP ${response.status}: ${response.statusText}`;
        console.log(`❌ Execution ${execution.id} failed with status ${response.status}`);
      }

    } catch (error) {
      clearTimeout(timeoutId);
      
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      
      console.log(`❌ Execution ${execution.id} failed:`, execution.error);
    } finally {
      // Clean up after a delay to allow for monitoring
      const cleanupDelay = this.config.settings?.executionCleanupDelay || 60000;
      setTimeout(() => {
        this.cleanupExecution(execution.id);
      }, cleanupDelay);
    }
  }

  /**
   * Start a registered job
   */
  startJob(jobId: string): boolean {
    const jobData = this.jobs.get(jobId);
    if (jobData) {
      jobData.task.start();
      jobData.isRunning = true;
      console.log(`▶️ Started cron job: ${jobId}`);
      return true;
    }
    console.log(`❌ Job not found: ${jobId}`);
    return false;
  }

  /**
   * Stop a running job
   */
  stopJob(jobId: string): boolean {
    const jobData = this.jobs.get(jobId);
    if (jobData) {
      jobData.task.stop();
      jobData.isRunning = false;
      console.log(`⏸️ Stopped cron job: ${jobId}`);
      return true;
    }
    console.log(`❌ Job not found: ${jobId}`);
    return false;
  }

  /**
   * Start all registered jobs
   */
  startAllJobs(): void {
    for (const [jobId] of this.jobs) {
      this.startJob(jobId);
    }
    console.log(`▶️ Started all cron jobs (${this.jobs.size} jobs)`);
  }

  /**
   * Stop all running jobs
   */
  stopAllJobs(): void {
    for (const [jobId] of this.jobs) {
      this.stopJob(jobId);
    }
    console.log(`⏸️ Stopped all cron jobs`);
  }

  /**
   * Get job status and running executions
   */
  getJobStatus(jobId: string): {
    jobId: string;
    isRunning: boolean;
    runningExecutions: CronExecution[];
    recentExecutions: CronExecution[];
  } {
    const jobData = this.jobs.get(jobId);
    const allExecutions = Array.from(this.executions.values()).filter(e => e.jobId === jobId);
    const runningExecutions = allExecutions.filter(e => e.status === 'running');
    const recentExecutions = allExecutions
      .filter(e => e.status !== 'running')
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, 10); // Last 10 completed executions

    return {
      jobId,
      isRunning: jobData?.isRunning || false,
      runningExecutions,
      recentExecutions
    };
  }

  /**
   * Get overall service status
   */
  getServiceStatus(): {
    totalJobs: number;
    runningJobs: number;
    totalRunningExecutions: number;
    jobs: Array<{
      jobId: string;
      isRunning: boolean;
      runningExecutions: number;
      schedule: string;
      description?: string;
    }>;
    config: CronConfig;
  } {
    const jobs = Array.from(this.jobs.entries()).map(([jobId, jobData]) => {
      const runningExecutions = Array.from(this.executions.values())
        .filter(e => e.jobId === jobId && e.status === 'running').length;
      
      return {
        jobId,
        isRunning: jobData.isRunning,
        runningExecutions,
        schedule: jobData.job.schedule,
        description: jobData.job.description
      };
    });

    return {
      totalJobs: this.jobs.size,
      runningJobs: jobs.filter(j => j.isRunning).length,
      totalRunningExecutions: Array.from(this.executions.values())
        .filter(e => e.status === 'running').length,
      jobs,
      config: this.config
    };
  }

  /**
   * Manually trigger a job execution (useful for testing)
   */
  async triggerJob(jobId: string): Promise<string> {
    const jobData = this.jobs.get(jobId);
    if (!jobData) {
      throw new Error(`Job ${jobId} not found`);
    }

    const executionId = uuidv4();
    console.log(`🎯 Manually triggered job ${jobId} with execution ID: ${executionId}`);
    
    this.executeJob(jobData.job);
    return executionId;
  }

  /**
   * Clean up completed executions to prevent memory leaks
   */
  private cleanupExecution(executionId: string): void {
    this.executions.delete(executionId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): CronJob[] {
    return Array.from(this.jobs.values()).map(jobData => jobData.job);
  }

  /**
   * Remove a job
   */
  removeJob(jobId: string): boolean {
    const jobData = this.jobs.get(jobId);
    if (jobData) {
      jobData.task.stop();
      jobData.task.destroy();
      this.jobs.delete(jobId);
      console.log(`🗑️ Removed cron job: ${jobId}`);
      return true;
    }
    return false;
  }

  /**
   * Update endpoint URL for a specific job
   */
  updateJobEndpointUrl(jobId: string, endpointUrl: string): void {
    const jobData = this.jobs.get(jobId);
    if (jobData) {
      jobData.job.endpointUrl = endpointUrl;
      console.log(`🔄 Updated endpoint URL for job ${jobId} to: ${endpointUrl}`);
    } else {
      throw new Error(`Job ${jobId} not found`);
    }
  }

  /**
   * Destroy the service and clean up all resources
   */
  destroy(): void {
    this.stopAllJobs();
    for (const [jobId, jobData] of this.jobs) {
      jobData.task.destroy();
    }
    this.jobs.clear();
    this.executions.clear();
    console.log('🧹 Cron service destroyed and cleaned up');
  }
}

export default CronService; 