export interface CronJob {
  id: string;
  endpointUrl: string;
  schedule: string;
  description?: string;
  timeout?: number; // in milliseconds
}

export interface CronExecution {
  id: string;
  jobId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  error?: string;
  duration?: number;
}

export interface VercelJsonImport {
  vercelJsonPath: string;
  baseUrl: string;
  description?: string;
  timeout?: number;
}

export interface VercelCronConfig {
  path: string;
  schedule: string;
}

export interface VercelJson {
  crons: VercelCronConfig[];
}

export interface CronConfig {
  crons: Array<{
    endpointUrl: string;
    schedule: string;
    description?: string;
    timeout?: number;
  }>;
  imports?: VercelJsonImport[];
  settings?: {
    defaultTimeout?: number;
    maxConcurrentExecutions?: number;
    executionCleanupDelay?: number;
  };
}

export interface ServiceStatus {
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
  timestamp: string;
  uptime: number;
}

export interface JobStatus {
  jobId: string;
  isRunning: boolean;
  runningExecutions: CronExecution[];
  recentExecutions: CronExecution[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface TriggerJobRequest {
  action: 'trigger';
  jobId?: string;
  jobIndex?: number;
}

export interface ControlJobRequest {
  action: 'start' | 'stop' | 'restart';
  jobId?: string;
}

export interface UpdateConfigRequest {
  jobId?: string;
  endpointUrl?: string;
  settings?: CronConfig['settings'];
} 