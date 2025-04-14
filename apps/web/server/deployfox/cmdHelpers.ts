import { spawn, execSync } from "child_process";
import { platform } from "os";

// Helper function to run npm commands
export const runCommand = async (command: string, args: string[], projectPath: string): Promise<void> => {

  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      cwd: projectPath,
      stdio: 'inherit',
      shell: true
    });

    process.on('error', (error) => {
      console.error(`Failed to execute ${command}:`, error);
      reject(error);
    });

    process.on('close', (code) => {
      if (code === 0) {
        console.log(`${command} completed successfully`);
        resolve();
      } else {
        reject(new Error(`${command} failed with code ${code}`));
      }
    });
  });
};

// Helper function to find an available port on the machine
export const findAvailablePort = async (startPort: number = 9001, maxPort: number = 9500): Promise<number> => {
  return new Promise((resolve, reject) => {
    const testPort = (port: number) => {
      try {
        if (port > maxPort) {
          reject(new Error("No available ports found"));
        }

        // Determine the appropriate command based on the operating system
        let command: string;
        const os = platform();

        switch (os) {
          case 'win32':
            command = `netstat -ano | findstr :${port}`;
            break;
          case 'darwin':
          case 'linux':
            command = `netstat -tuln | grep :${port}`;
            break;
          default:
            command = `netstat -tuln | grep :${port}`;
        }

        // Check if port is in use
        execSync(command);
        console.log(`Port ${port} is already in use, trying next port`);
        testPort(port + 1);
      } catch (err) {
        // If command fails, the port is likely free
        console.log(`Port ${port} is available`);
        resolve(port);
      }
    };

    testPort(startPort);
  });
};