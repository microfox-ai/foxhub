import * as fs from 'fs';
import * as path from 'path';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}

class LogService {
  private logFilePath: string;
  private maxLogs: number = 1000;
  private maxAge: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor() {
    // Create logs directory in the cron service folder
    const logsDir = path.resolve(__dirname, '../../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    this.logFilePath = path.join(logsDir, 'cron-service.log');
  }

  /**
   * Read logs from file
   */
  private readLogsFromFile(): LogEntry[] {
    try {
      if (!fs.existsSync(this.logFilePath)) {
        return [];
      }
      
      const fileContent = fs.readFileSync(this.logFilePath, 'utf8');
      if (!fileContent.trim()) {
        return [];
      }
      
      return fileContent
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            const parsed = JSON.parse(line);
            // Convert timestamp back to Date object
            parsed.timestamp = new Date(parsed.timestamp);
            return parsed;
          } catch {
            return null;
          }
        })
        .filter(entry => entry !== null) as LogEntry[];
    } catch (error) {
      console.error('Error reading logs from file:', error);
      return [];
    }
  }

  /**
   * Write logs to file
   */
  private writeLogsToFile(logs: LogEntry[]): void {
    try {
      const logLines = logs.map(log => JSON.stringify({
        ...log,
        timestamp: log.timestamp.toISOString()
      })).join('\n');
      
      fs.writeFileSync(this.logFilePath, logLines + '\n', 'utf8');
    } catch (error) {
      console.error('Error writing logs to file:', error);
    }
  }

  /**
   * Append a single log entry to file
   */
  private appendLogToFile(logEntry: LogEntry): void {
    try {
      const logLine = JSON.stringify({
        ...logEntry,
        timestamp: logEntry.timestamp.toISOString()
      }) + '\n';
      
      fs.appendFileSync(this.logFilePath, logLine, 'utf8');
    } catch (error) {
      console.error('Error appending log to file:', error);
    }
  }

  /**
   * Add a new log entry
   */
  log(level: LogEntry['level'], message: string, data?: any): void {
    const logEntry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      message,
      data
    };

    // Append to file
    this.appendLogToFile(logEntry);

    // Cleanup old logs periodically (every 10th log entry)
    if (Math.random() < 0.1) {
      this.cleanup();
    }
  }

  /**
   * Get recent logs with optional filtering
   */
  getLogs(limit?: number, level?: LogEntry['level']): LogEntry[] {
    const allLogs = this.readLogsFromFile();
    let filteredLogs = allLogs;

    if (level) {
      filteredLogs = allLogs.filter(log => log.level === level);
    }

    // Sort by timestamp descending (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (limit) {
      filteredLogs = filteredLogs.slice(0, limit);
    }

    return filteredLogs;
  }

  /**
   * Get logs count by level
   */
  getLogStats(): { total: number; info: number; warn: number; error: number; debug: number } {
    const allLogs = this.readLogsFromFile();
    
    return {
      total: allLogs.length,
      info: allLogs.filter(log => log.level === 'info').length,
      warn: allLogs.filter(log => log.level === 'warn').length,
      error: allLogs.filter(log => log.level === 'error').length,
      debug: allLogs.filter(log => log.level === 'debug').length
    };
  }

  /**
   * Cleanup old logs (called automatically and manually)
   */
  private cleanup(): void {
    try {
      const allLogs = this.readLogsFromFile();
      const now = Date.now();
      
      // Remove logs older than maxAge
      let filteredLogs = allLogs.filter(log => 
        now - log.timestamp.getTime() < this.maxAge
      );

      // Keep only the most recent maxLogs entries
      if (filteredLogs.length > this.maxLogs) {
        filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        filteredLogs = filteredLogs.slice(0, this.maxLogs);
      }

      // Write back to file
      this.writeLogsToFile(filteredLogs);
    } catch (error) {
      console.error('Error during log cleanup:', error);
    }
  }

  /**
   * Manual cleanup (can be called by cron job)
   */
  cleanupLogs(): { deletedCount: number; remainingCount: number } {
    try {
      const beforeCount = this.readLogsFromFile().length;
      this.cleanup();
      const afterCount = this.readLogsFromFile().length;

      return {
        deletedCount: beforeCount - afterCount,
        remainingCount: afterCount
      };
    } catch (error) {
      console.error('Error during manual log cleanup:', error);
      return { deletedCount: 0, remainingCount: 0 };
    }
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    try {
      fs.writeFileSync(this.logFilePath, '', 'utf8');
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  }

  /**
   * Get log file path for reference
   */
  getLogFilePath(): string {
    return this.logFilePath;
  }
}

// Export singleton instance
export default new LogService(); 