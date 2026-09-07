/**
 * Framework Detector Module
 * Identifies project type and framework from file structure
 */

const fs = require('fs');
const path = require('path');

class FrameworkDetector {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.packageJson = null;
    this.projectType = null;
    this.framework = null;
    this.buildScript = null;
    this.devScript = null;
    this.entryPoint = null;
    this.port = 3000;
  }

  async detect() {
    try {
      this.loadPackageJson();
      this.detectFramework();
      this.detectScripts();
      this.detectEntryPoint();
      
      return {
        projectType: this.projectType,
        framework: this.framework,
        buildScript: this.buildScript,
        devScript: this.devScript,
        entryPoint: this.entryPoint,
        port: this.port,
        isValid: this.projectType !== null
      };
    } catch (err) {
      console.error('Framework detection error:', err);
      return {
        projectType: 'unknown',
        framework: null,
        buildScript: null,
        devScript: null,
        entryPoint: null,
        port: 3000,
        isValid: false,
        error: err.message
      };
    }
  }

  loadPackageJson() {
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const content = fs.readFileSync(packageJsonPath, 'utf8');
      this.packageJson = JSON.parse(content);
    }
  }

  detectFramework() {
    if (!this.packageJson) {
      this.detectStaticWebsite();
      return;
    }

    const deps = {
      ...this.packageJson.dependencies,
      ...this.packageJson.devDependencies
    };

    if (deps['next']) {
      this.projectType = 'web-app';
      this.framework = 'nextjs';
      this.port = 3000;
    } else if (deps['astro']) {
      this.projectType = 'web-app';
      this.framework = 'astro';
      this.port = 3000;
    } else if (deps['vite']) {
      this.projectType = 'web-app';
      this.framework = 'vite';
      this.port = 5173;
    } else if (deps['react']) {
      this.projectType = 'web-app';
      this.framework = 'react';
      this.port = 3000;
    } else if (deps['vue']) {
      this.projectType = 'web-app';
      this.framework = 'vue';
      this.port = 5173;
    } else if (deps['svelte']) {
      this.projectType = 'web-app';
      this.framework = 'svelte';
      this.port = 5173;
    } else if (deps['express'] || deps['fastify'] || deps['koa']) {
      this.projectType = 'web-app';
      this.framework = 'nodejs-server';
      this.port = 3000;
    } else if (this.packageJson.scripts && this.packageJson.scripts.dev) {
      this.projectType = 'web-app';
      this.framework = 'custom-npm';
      this.port = 3000;
    } else {
      this.detectStaticWebsite();
    }
  }

  detectStaticWebsite() {
    const indexHtmlPath = path.join(this.projectPath, 'index.html');
    const indexJsPath = path.join(this.projectPath, 'index.js');
    
    if (fs.existsSync(indexHtmlPath)) {
      this.projectType = 'website';
      this.framework = 'static-html';
      this.entryPoint = 'index.html';
      this.port = 8080;
    } else if (fs.existsSync(indexJsPath)) {
      this.projectType = 'website';
      this.framework = 'static-js';
      this.entryPoint = 'index.js';
      this.port = 8080;
    } else {
      this.projectType = 'unknown';
      this.framework = null;
    }
  }

  detectScripts() {
    if (!this.packageJson || !this.packageJson.scripts) return;

    const scripts = this.packageJson.scripts;
    
    this.devScript = scripts.dev || scripts.start || scripts['dev:server'];
    this.buildScript = scripts.build || scripts['build:prod'];
  }

  detectEntryPoint() {
    if (this.projectType === 'website') {
      if (!this.entryPoint) {
        const candidates = ['index.html', 'index.js', 'main.html', 'main.js'];
        for (const candidate of candidates) {
          if (fs.existsSync(path.join(this.projectPath, candidate))) {
            this.entryPoint = candidate;
            break;
          }
        }
      }
    } else if (this.projectType === 'web-app') {
      if (this.framework === 'nextjs') {
        this.entryPoint = 'pages/index.js';
      } else if (this.framework === 'astro') {
        this.entryPoint = 'src/pages/index.astro';
      } else {
        this.entryPoint = 'index.html';
      }
    }
  }

  getFrameworkInfo() {
    const info = {
      nextjs: {
        name: 'Next.js',
        icon: '▲',
        color: '#000000',
        description: 'React framework with SSR'
      },
      astro: {
        name: 'Astro',
        icon: '⭐',
        color: '#FF5D01',
        description: 'Static site builder'
      },
      vite: {
        name: 'Vite',
        icon: '⚡',
        color: '#646CFF',
        description: 'Frontend build tool'
      },
      react: {
        name: 'React',
        icon: '⚛',
        color: '#61DAFB',
        description: 'UI library'
      },
      vue: {
        name: 'Vue',
        icon: '💚',
        color: '#4FC08D',
        description: 'Progressive framework'
      },
      svelte: {
        name: 'Svelte',
        icon: '🔥',
        color: '#FF3E00',
        description: 'Compiler framework'
      },
      'nodejs-server': {
        name: 'Node.js Server',
        icon: '🟢',
        color: '#339933',
        description: 'Backend server'
      },
      'custom-npm': {
        name: 'Custom NPM',
        icon: '📦',
        color: '#CB3837',
        description: 'Custom npm scripts'
      },
      'static-html': {
        name: 'Static HTML',
        icon: '📄',
        color: '#E34C26',
        description: 'Plain HTML/CSS/JS'
      },
      'static-js': {
        name: 'Static JS',
        icon: '📜',
        color: '#F7DF1E',
        description: 'JavaScript project'
      }
    };

    return info[this.framework] || {
      name: 'Unknown',
      icon: '❓',
      color: '#999999',
      description: 'Unknown framework'
    };
  }
}

module.exports = { FrameworkDetector };
