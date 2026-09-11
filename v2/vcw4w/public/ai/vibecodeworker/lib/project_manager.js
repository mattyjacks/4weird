/**
 * Project Manager Module
 * Unified interface for managing websites and web apps
 */

const fs = require('fs');
const path = require('path');
const { FrameworkDetector } = require('./framework_detector');
const { DevServer, StaticServer } = require('./dev_server');

class ProjectManager {
  constructor() {
    this.projects = new Map();
    this.activeProject = null;
    this.servers = new Map();
  }

  async loadProject(projectPath) {
    try {
      if (!fs.existsSync(projectPath)) {
        throw new Error(`Project path does not exist: ${projectPath}`);
      }

      const detector = new FrameworkDetector(projectPath);
      const detection = await detector.detect();

      if (!detection.isValid) {
        throw new Error(`Could not detect project type: ${detection.error}`);
      }

      const project = {
        id: path.basename(projectPath),
        path: projectPath,
        name: path.basename(projectPath),
        ...detection,
        detector,
        createdAt: Date.now(),
        lastOpened: Date.now()
      };

      this.projects.set(projectPath, project);
      this.activeProject = projectPath;

      return project;
    } catch (err) {
      console.error('Failed to load project:', err);
      throw err;
    }
  }

  async startProject(projectPath) {
    try {
      const project = this.projects.get(projectPath);
      if (!project) {
        throw new Error('Project not loaded');
      }

      let server;

      if (project.projectType === 'website') {
        server = new StaticServer(projectPath, project.port);
        await server.start();
      } else if (project.projectType === 'web-app') {
        if (!project.devScript) {
          throw new Error('No dev script found in package.json');
        }

        const portAvailable = await this.findAvailablePort(project.port);
        server = new DevServer(projectPath, project.framework, project.devScript, portAvailable);
        
        await server.start();
        await server.waitForReady();
      } else {
        throw new Error(`Unsupported project type: ${project.projectType}`);
      }

      this.servers.set(projectPath, server);
      project.server = server;
      project.isRunning = true;
      project.startedAt = Date.now();

      return {
        success: true,
        projectPath,
        framework: project.framework,
        port: server.port,
        url: `http://localhost:${server.port}`,
        type: project.projectType
      };
    } catch (err) {
      console.error('Failed to start project:', err);
      throw err;
    }
  }

  async stopProject(projectPath) {
    try {
      const server = this.servers.get(projectPath);
      if (!server) return;

      await server.stop();
      this.servers.delete(projectPath);

      const project = this.projects.get(projectPath);
      if (project) {
        project.isRunning = false;
        project.stoppedAt = Date.now();
      }

      return { success: true, projectPath };
    } catch (err) {
      console.error('Failed to stop project:', err);
      throw err;
    }
  }

  async findAvailablePort(startPort = 3000) {
    const http = require('http');
    
    for (let port = startPort; port < startPort + 100; port++) {
      const available = await new Promise((resolve) => {
        const server = http.createServer();
        server.once('error', (err) => {
          resolve(err.code !== 'EADDRINUSE');
        });
        server.once('listening', () => {
          server.close();
          resolve(true);
        });
        server.listen(port);
      });

      if (available) return port;
    }

    throw new Error(`No available ports found starting from ${startPort}`);
  }

  getProject(projectPath) {
    return this.projects.get(projectPath);
  }

  getActiveProject() {
    return this.activeProject ? this.projects.get(this.activeProject) : null;
  }

  getAllProjects() {
    return Array.from(this.projects.values());
  }

  getProjectStatus(projectPath) {
    const project = this.projects.get(projectPath);
    if (!project) return null;

    const server = this.servers.get(projectPath);
    return {
      projectPath,
      name: project.name,
      framework: project.framework,
      projectType: project.projectType,
      isRunning: project.isRunning || false,
      port: project.port,
      url: project.isRunning ? `http://localhost:${project.port}` : null,
      uptime: project.isRunning ? Date.now() - project.startedAt : 0,
      serverStatus: server ? server.getStatus() : null
    };
  }

  getServerOutput(projectPath) {
    const server = this.servers.get(projectPath);
    if (!server || server.constructor.name === 'StaticServer') {
      return 'Static server (no output)';
    }
    return server.getOutput();
  }

  async reloadProject(projectPath) {
    const project = this.projects.get(projectPath);
    if (!project || !project.isRunning) {
      throw new Error('Project not running');
    }

    await this.stopProject(projectPath);
    return this.startProject(projectPath);
  }

  removeProject(projectPath) {
    this.projects.delete(projectPath);
    this.servers.delete(projectPath);
    if (this.activeProject === projectPath) {
      this.activeProject = null;
    }
  }

  setActiveProject(projectPath) {
    if (this.projects.has(projectPath)) {
      this.activeProject = projectPath;
      const project = this.projects.get(projectPath);
      project.lastOpened = Date.now();
      return true;
    }
    return false;
  }
}

module.exports = { ProjectManager };
