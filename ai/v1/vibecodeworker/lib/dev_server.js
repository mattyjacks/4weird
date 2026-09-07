/**
 * Dev Server Abstraction Module
 * Manages launching and lifecycle of dev servers for web projects
 */

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

class DevServer {
  constructor(projectPath, framework, devScript, port = 3000) {
    this.projectPath = projectPath;
    this.framework = framework;
    this.devScript = devScript;
    this.port = port;
    this.process = null;
    this.isRunning = false;
    this.output = [];
    this.error = null;
    this.startTime = null;
    this.readyPromise = null;
    this.readyResolve = null;
  }

  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.readyPromise = new Promise(res => {
          this.readyResolve = res;
        });

        const command = this.getStartCommand();
        const args = this.getStartArgs();

        console.log(`Starting ${this.framework} dev server on port ${this.port}`);
        console.log(`Command: ${command} ${args.join(' ')}`);

        this.process = spawn(command, args, {
          cwd: this.projectPath,
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: true,
          detached: false
        });

        this.startTime = Date.now();
        this.isRunning = true;

        this.process.stdout.on('data', (data) => {
          const text = data.toString();
          this.output.push(text);
          console.log(`[${this.framework}] ${text}`);
          this.checkIfReady(text);
        });

        this.process.stderr.on('data', (data) => {
          const text = data.toString();
          this.output.push(text);
          console.error(`[${this.framework}] ERROR: ${text}`);
          this.checkIfReady(text);
        });

        this.process.on('error', (err) => {
          this.error = err;
          this.isRunning = false;
          console.error(`Failed to start ${this.framework}:`, err);
          reject(err);
        });

        this.process.on('exit', (code) => {
          this.isRunning = false;
          console.log(`${this.framework} dev server exited with code ${code}`);
        });

        setTimeout(() => {
          if (this.isRunning) {
            resolve({
              success: true,
              port: this.port,
              framework: this.framework,
              uptime: Date.now() - this.startTime
            });
          }
        }, 3000);

      } catch (err) {
        this.error = err;
        reject(err);
      }
    });
  }

  getStartCommand() {
    if (process.platform === 'win32') {
      return 'cmd.exe';
    }
    return '/bin/sh';
  }

  getStartArgs() {
    if (process.platform === 'win32') {
      return ['/c', this.devScript];
    }
    return ['-c', this.devScript];
  }

  checkIfReady(output) {
    const readyPatterns = [
      /ready on/i,
      /listening on/i,
      /started server/i,
      /dev server running/i,
      /local:.*http/i,
      /compiled successfully/i,
      /ready in/i
    ];

    if (readyPatterns.some(pattern => pattern.test(output))) {
      if (this.readyResolve) {
        this.readyResolve();
        this.readyResolve = null;
      }
    }
  }

  async waitForReady(timeout = 30000) {
    if (!this.readyPromise) {
      return Promise.resolve();
    }
    return Promise.race([
      this.readyPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Dev server startup timeout')), timeout)
      )
    ]);
  }

  async isPortAvailable() {
    return new Promise((resolve) => {
      const server = http.createServer();
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          resolve(true);
        }
      });
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(this.port);
    });
  }

  async findAvailablePort(startPort = 3000, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
      const testPort = startPort + i;
      const available = await this.isPortAvailable();
      if (available) {
        this.port = testPort;
        return testPort;
      }
    }
    throw new Error(`No available ports found starting from ${startPort}`);
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.process || !this.isRunning) {
        resolve();
        return;
      }

      this.isRunning = false;

      if (process.platform === 'win32') {
        require('child_process').exec(`taskkill /pid ${this.process.pid} /T /F`, () => {
          resolve();
        });
      } else {
        this.process.kill('SIGTERM');
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.process.kill('SIGKILL');
          }
          resolve();
        }, 2000);
      }
    });
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      framework: this.framework,
      port: this.port,
      uptime: this.isRunning ? Date.now() - this.startTime : 0,
      error: this.error ? this.error.message : null,
      outputLines: this.output.length
    };
  }

  getOutput() {
    return this.output.join('\n');
  }

  clearOutput() {
    this.output = [];
  }
}

class StaticServer {
  constructor(projectPath, port = 8080) {
    this.projectPath = projectPath;
    this.port = port;
    this.server = null;
    this.isRunning = false;
    this.startTime = null;
  }

  async start() {
    return new Promise((resolve, reject) => {
      try {
        const http = require('http');
        const fs = require('fs');
        const path = require('path');
        const mime = require('mime-types');

        this.server = http.createServer((req, res) => {
          let filePath = path.join(this.projectPath, req.url === '/' ? 'index.html' : req.url);

          if (!filePath.startsWith(this.projectPath)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
          }

          fs.stat(filePath, (err, stats) => {
            if (err) {
              if (req.url !== '/' && req.url.endsWith('.html')) {
                res.writeHead(404);
                res.end('Not Found');
              } else {
                const indexPath = path.join(this.projectPath, 'index.html');
                fs.readFile(indexPath, (err, data) => {
                  if (err) {
                    res.writeHead(404);
                    res.end('Not Found');
                  } else {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(data);
                  }
                });
              }
              return;
            }

            if (stats.isDirectory()) {
              const indexPath = path.join(filePath, 'index.html');
              fs.readFile(indexPath, (err, data) => {
                if (err) {
                  res.writeHead(404);
                  res.end('Not Found');
                } else {
                  res.writeHead(200, { 'Content-Type': 'text/html' });
                  res.end(data);
                }
              });
            } else {
              const mimeType = mime.lookup(filePath) || 'application/octet-stream';
              fs.readFile(filePath, (err, data) => {
                if (err) {
                  res.writeHead(500);
                  res.end('Internal Server Error');
                } else {
                  res.writeHead(200, { 'Content-Type': mimeType });
                  res.end(data);
                }
              });
            }
          });
        });

        this.server.listen(this.port, () => {
          this.isRunning = true;
          this.startTime = Date.now();
          console.log(`Static server running on port ${this.port}`);
          resolve({
            success: true,
            port: this.port,
            type: 'static',
            uptime: 0
          });
        });

        this.server.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            reject(new Error(`Port ${this.port} is already in use`));
          } else {
            reject(err);
          }
        });

      } catch (err) {
        reject(err);
      }
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.isRunning = false;
      this.server.close(() => {
        resolve();
      });
    });
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      type: 'static',
      port: this.port,
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    };
  }
}

module.exports = { DevServer, StaticServer };
