# Foxhub Cron Service

A standalone cron service that provides Vercel-like functionality with concurrency support, allowing multiple instances of the same cron job to run simultaneously without blocking each other.

## Features

- ✅ **Vercel-like Concurrency**: Multiple instances of the same cron job can run simultaneously
- ✅ **HTTP-based Execution**: Makes HTTP calls to specified endpoints
- ✅ **Manual Triggering**: Trigger any cron job manually via REST API
- ✅ **Real-time Monitoring**: Monitor job status and running executions
- ✅ **Configuration Management**: Update job configurations on the fly
- ✅ **Vercel.json Import**: Import cron jobs from existing vercel.json files
- ✅ **Graceful Shutdown**: Proper cleanup and shutdown handling
- ✅ **VPC Deployment Ready**: Designed for deployment in VPC infrastructure

## Configuration

### Basic Configuration (cron.json)

Create a `cron.json` file at the repository root:

```json
{
  "crons": [
    {
      "endpointUrl": "http://localhost:3000/api/cron/test-concurrency",
      "schedule": "*/5 * * * *",
      "description": "Test endpoint for concurrent execution testing",
      "timeout": 30000
    }
  ],
  "settings": {
    "defaultTimeout": 300000,
    "maxConcurrentExecutions": 10,
    "executionCleanupDelay": 60000
  }
}
```

### Vercel.json Import

You can import cron jobs from existing `vercel.json` files instead of duplicating configurations:

```json
{
  "crons": [
    {
      "endpointUrl": "http://localhost:3000/api/cron/manual-job",
      "schedule": "0 9 * * *",
      "description": "Manual job definition"
    }
  ],
  "imports": [
    {
      "vercelJsonPath": "apps/web/vercel.json",
      "baseUrl": "http://localhost:3000",
      "description": "Imported from web app vercel.json",
      "timeout": 300000
    },
    {
      "vercelJsonPath": "apps/api/vercel.json",
      "baseUrl": "https://api.yourapp.com",
      "description": "Imported from API vercel.json",
      "timeout": 600000
    }
  ],
  "settings": {
    "defaultTimeout": 300000,
    "maxConcurrentExecutions": 10,
    "executionCleanupDelay": 60000
  }
}
```

#### Import Configuration

- `vercelJsonPath`: Relative path to the vercel.json file from the cron.json location
- `baseUrl`: Base URL to prepend to the paths from vercel.json
- `description`: Optional description template for imported jobs
- `timeout`: Optional timeout override for imported jobs

The service will:
1. Load the specified vercel.json file
2. Convert each cron job from `path` + `schedule` format to `endpointUrl` + `schedule`
3. Combine `baseUrl` + `path` to create the full `endpointUrl`
4. Apply the optional timeout and description to imported jobs

### Vercel.json Format

Your `vercel.json` should have cron jobs in standard Vercel format:

```json
{
  "crons": [
    {
      "path": "/api/cron/usage-reports",
      "schedule": "59 23 * * *"
    },
    {
      "path": "/api/cron/webhook-events",
      "schedule": "*/1 * * * *"
    },
    {
      "path": "/api/cron/data-cleanup",
      "schedule": "0 2 * * 0"
    }
  ]
}
```

## Quick Start

1. **Install dependencies**:
   ```bash
   cd apps/cron
   npm install
   ```

2. **Build the service**:
   ```bash
   npm run build
   ```

3. **Start the service**:
   ```bash
   npm start
   ```

The service will run on port 8003 and load configuration from the repository root `cron.json`. No environment variables are required - the service is completely self-contained.

## API Endpoints

### Health Check
```http
GET /health
```

### Job Management
```http
GET /api/cron/jobs              # List all jobs
GET /api/cron/jobs/:jobId       # Get specific job status
POST /api/cron/trigger          # Trigger job manually
POST /api/cron/control          # Control jobs (start/stop/restart)
GET /api/cron/status            # Get service status
```

### Configuration
```http
POST /api/cron/reload           # Reload configuration
PUT /api/cron/config            # Update configuration
POST /api/cron/shutdown         # Graceful shutdown
```

## Examples

### Manual Job Triggering
```bash
# Trigger by job ID
curl -X POST http://localhost:8003/api/cron/trigger \
  -H "Content-Type: application/json" \
  -d '{"jobId": "cron-job-0"}'

# Trigger by job index
curl -X POST http://localhost:8003/api/cron/trigger \
  -H "Content-Type: application/json" \
  -d '{"jobIndex": 0}'
```

### Job Control
```bash
# Stop all jobs
curl -X POST http://localhost:8003/api/cron/control \
  -H "Content-Type: application/json" \
  -d '{"action": "stop"}'

# Start specific job
curl -X POST http://localhost:8003/api/cron/control \
  -H "Content-Type: application/json" \
  -d '{"action": "start", "jobId": "cron-job-0"}'

# Restart service (reload config)
curl -X POST http://localhost:8003/api/cron/control \
  -H "Content-Type: application/json" \
  -d '{"action": "restart"}'
```

## Development

### Scripts
- `npm run dev`: Start in development mode with hot reload
- `npm run build`: Build TypeScript to JavaScript
- `npm start`: Start the production build

## Deployment

### GitHub Actions
The service includes a GitHub Actions workflow for automated deployment using PM2:

```yaml
# .github/workflows/cron-deploy.yml
name: Deploy Cron Service
on:
  push:
    branches: [main]
    paths: ['apps/cron/**', 'cron.json']
```

### Manual Deployment
1. Build the service: `npm run build`
2. Copy the built files to your server
3. Install PM2: `npm install -g pm2`
4. Start with PM2: `pm2 start dist/server.js --name foxhub-cron`

## Architecture

The service consists of:
- **CronManager**: Handles configuration loading and service lifecycle
- **CronService**: Manages individual cron jobs and executions
- **Express API**: REST endpoints for control and monitoring
- **Vercel.json Import**: Automatic import and conversion of Vercel cron configurations

## Configuration

The service is completely environment-free and runs with these hardcoded settings:
- **Port**: 8003 (fixed)
- **Mode**: Production (always)
- **CORS**: Allow all origins (`*`)
- **Config Path**: Repository root `cron.json` (fixed)

No environment variables are needed or supported.

## License

MIT License - see LICENSE file for details. 