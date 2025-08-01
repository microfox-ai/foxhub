import * as fs from 'fs';
import * as path from 'path';
import CronService from './cron-service';
import { CronConfig, CronJob, VercelJson, VercelJsonImport } from '../types/cron.types';

class CronManager {
  private cronService: CronService | null = null;
  private config: CronConfig | null = null;
  private configPath: string;
  private startTime: Date = new Date();

  constructor(configPath?: string) {
    // Default to cron.json at the repo root (three levels up from this file)
    // Current file is at: apps/cron/src/lib/cron-manager.ts
    // Need to go up: lib -> src -> cron -> apps -> root
    this.configPath = configPath || path.resolve(__dirname, '../../cron.json');
  }

  /**
   * Load vercel.json configuration from file path
   */
  private loadVercelJson(vercelJsonPath: string): VercelJson {
    try {
      // Resolve path relative to the config file's directory
      const configDir = path.dirname(this.configPath);
      const fullVercelPath = path.resolve(configDir, vercelJsonPath);
      
      console.log(`📖 Loading vercel.json from: ${fullVercelPath}`);
      
      if (!fs.existsSync(fullVercelPath)) {
        throw new Error(`Vercel.json file not found: ${fullVercelPath}`);
      }

      const vercelData = fs.readFileSync(fullVercelPath, 'utf8');
      const vercelConfig = JSON.parse(vercelData) as VercelJson;
      
      if (!vercelConfig.crons || !Array.isArray(vercelConfig.crons)) {
        throw new Error(`Invalid vercel.json format: missing or invalid 'crons' array`);
      }
      
      return vercelConfig;
    } catch (error) {
      console.error(`❌ Error loading vercel.json from ${vercelJsonPath}:`, error);
      throw error;
    }
  }

  /**
   * Convert vercel.json cron configs to our format
   */
  private convertVercelCrons(vercelImport: VercelJsonImport, vercelConfig: VercelJson): CronJob[] {
    return vercelConfig.crons.map((vercelCron, index) => ({
      id: `vercel-${path.basename(vercelImport.vercelJsonPath, '.json')}-${index}`,
      endpointUrl: `${vercelImport.baseUrl.replace(/\/$/, '')}${vercelCron.path}`,
      schedule: vercelCron.schedule,
      description: vercelImport.description || `Imported from ${vercelImport.vercelJsonPath}: ${vercelCron.path}`,
      timeout: vercelImport.timeout
    }));
  }

  /**
   * Load cron configuration from file and process imports
   */
  loadConfig(): CronConfig {
    try {
      console.log(`📖 Loading cron configuration from: ${this.configPath}`);
      
      if (!fs.existsSync(this.configPath)) {
        throw new Error(`Configuration file not found: ${this.configPath}`);
      }

      const configData = fs.readFileSync(this.configPath, 'utf8');
      const baseConfig = JSON.parse(configData) as CronConfig;
      
      console.log(`✅ Loaded ${baseConfig.crons.length} direct cron job(s) from configuration`);
      
      // Process vercel.json imports if any
      if (baseConfig.imports && baseConfig.imports.length > 0) {
        console.log(`📦 Processing ${baseConfig.imports.length} vercel.json import(s)...`);
        
        const importedCrons: Array<{
          endpointUrl: string;
          schedule: string;
          description?: string;
          timeout?: number;
        }> = [];
        
        for (const vercelImport of baseConfig.imports) {
          try {
            const vercelConfig = this.loadVercelJson(vercelImport.vercelJsonPath);
            const convertedJobs = this.convertVercelCrons(vercelImport, vercelConfig);
            
            // Convert to config format
            const configCrons = convertedJobs.map(job => ({
              endpointUrl: job.endpointUrl,
              schedule: job.schedule,
              description: job.description,
              timeout: job.timeout
            }));
            
            importedCrons.push(...configCrons);
            console.log(`✅ Imported ${vercelConfig.crons.length} cron job(s) from ${vercelImport.vercelJsonPath}`);
          } catch (error) {
            console.error(`❌ Failed to import from ${vercelImport.vercelJsonPath}:`, error);
            throw error;
          }
        }
        
        // Combine direct crons with imported ones
        this.config = {
          ...baseConfig,
          crons: [...baseConfig.crons, ...importedCrons]
        };
        
        console.log(`✅ Total: ${this.config.crons.length} cron job(s) (${baseConfig.crons.length} direct + ${importedCrons.length} imported)`);
      } else {
        this.config = baseConfig;
      }
      
      return this.config;
    } catch (error) {
      console.error('❌ Error loading cron configuration:', error);
      throw error;
    }
  }

  /**
   * Initialize the cron service with loaded configuration
   */
  async initialize(): Promise<void> {
    try {
      // Load configuration if not already loaded
      if (!this.config) {
        this.loadConfig();
      }

      if (!this.config) {
        throw new Error('No configuration loaded');
      }

      // Initialize cron service
      this.cronService = new CronService(this.config);

      // Register all cron jobs from configuration
       this.config.crons.forEach((cronJobConfig, index) => {
         const job: CronJob = {
           id: `cron-job-${index}`,
           endpointUrl: cronJobConfig.endpointUrl,
           schedule: cronJobConfig.schedule,
           description: cronJobConfig.description || `Cron job for ${cronJobConfig.endpointUrl}`,
           timeout: cronJobConfig.timeout
         };

         this.cronService!.registerJob(job);
       });

      console.log(`🚀 Cron service initialized with ${this.config.crons.length} job(s)`);
    } catch (error) {
      console.error('❌ Error initializing cron service:', error);
      throw error;
    }
  }

  /**
   * Start all cron jobs
   */
  start(): void {
    if (!this.cronService) {
      throw new Error('Cron service not initialized. Call initialize() first.');
    }

    this.cronService.startAllJobs();
    console.log('▶️ All cron jobs started');
  }

  /**
   * Stop all cron jobs
   */
  stop(): void {
    if (!this.cronService) {
      console.log('⚠️ Cron service not initialized');
      return;
    }

    this.cronService.stopAllJobs();
    console.log('⏸️ All cron jobs stopped');
  }

  /**
   * Get the cron service instance
   */
  getService(): CronService {
    if (!this.cronService) {
      throw new Error('Cron service not initialized. Call initialize() first.');
    }
    return this.cronService;
  }

  /**
   * Get service status with additional metadata
   */
  getStatus() {
    if (!this.cronService) {
      throw new Error('Cron service not initialized');
    }

    const serviceStatus = this.cronService.getServiceStatus();
    return {
      ...serviceStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime.getTime(),
      configPath: this.configPath
    };
  }

  /**
   * Reload configuration and restart service
   */
  async reload(): Promise<void> {
    console.log('🔄 Reloading cron service...');
    
    try {
      // Stop current service
      this.stop();
      
      // Destroy current service
      if (this.cronService) {
        this.cronService.destroy();
      }

      // Reload and reinitialize
      await this.initialize();
      this.start();
      
      console.log('✅ Cron service reloaded successfully');
    } catch (error) {
      console.error('❌ Error reloading cron service:', error);
      throw error;
    }
  }

  /**
   * Update endpoint URL for a specific job
   */
  updateJobEndpointUrl(jobId: string, endpointUrl: string): void {
    if (!this.cronService) {
      throw new Error('Cron service not initialized');
    }

    this.cronService.updateJobEndpointUrl(jobId, endpointUrl);
    
    // Update config in memory
    if (this.config) {
      const cronIndex = parseInt(jobId.replace('cron-job-', ''));
      if (this.config.crons[cronIndex]) {
        this.config.crons[cronIndex].endpointUrl = endpointUrl;
      }
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down cron service...');
    
    try {
      this.stop();
      
      if (this.cronService) {
        this.cronService.destroy();
      }
      
      console.log('✅ Cron service shutdown complete');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  healthCheck(): { status: 'healthy' | 'unhealthy'; details: any } {
    try {
      if (!this.cronService) {
        return {
          status: 'unhealthy',
          details: { error: 'Service not initialized' }
        };
      }

      const status = this.getStatus();
      return {
        status: 'healthy',
        details: {
          totalJobs: status.totalJobs,
          runningJobs: status.runningJobs,
          uptime: status.uptime,
          configLoaded: !!this.config
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
}

export default CronManager; 