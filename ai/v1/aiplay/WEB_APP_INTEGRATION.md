# Web App Player & Debugger Integration Guide

## Overview

The Web App Player and Debugger features enable aiplay to play and debug websites and web apps with any framework and file structure. This guide explains the architecture and how to integrate these features into the main aiplay application.

## Architecture

### Core Modules

#### 1. **FrameworkDetector** (`lib/framework_detector.js`)
Automatically detects project type and framework from file structure.

```javascript
const { FrameworkDetector } = require('./lib/framework_detector');

const detector = new FrameworkDetector('/path/to/project');
const detection = await detector.detect();

// Returns:
// {
//   projectType: 'web-app' | 'website' | 'unknown',
//   framework: 'nextjs' | 'astro' | 'vite' | 'react' | 'vue' | 'svelte' | 'static-html' | null,
//   buildScript: 'npm run build' | null,
//   devScript: 'npm run dev' | null,
//   entryPoint: 'index.html' | 'pages/index.js' | null,
//   port: 3000 | 5173 | 8080,
//   isValid: true | false
// }
```

**Detection Logic:**
- Reads `package.json` for dependencies
- Scans for framework-specific config files
- Identifies entry points
- Classifies project type (web-app vs website)

#### 2. **DevServer** (`lib/dev_server.js`)
Manages launching and lifecycle of development servers.

```javascript
const { DevServer } = require('./lib/dev_server');

const server = new DevServer(
  '/path/to/project',
  'nextjs',
  'npm run dev',
  3000
);

await server.start();
await server.waitForReady();

// Returns status:
// {
//   isRunning: true,
//   framework: 'nextjs',
//   port: 3000,
//   uptime: 5000,
//   error: null,
//   outputLines: 42
// }

await server.stop();
```

**Features:**
- Cross-platform command execution (Windows/Unix)
- Port availability checking
- Automatic port allocation
- Ready state detection
- Output streaming and logging

#### 3. **StaticServer** (`lib/dev_server.js`)
Lightweight HTTP server for static websites.

```javascript
const { StaticServer } = require('./lib/dev_server');

const server = new StaticServer('/path/to/website', 8080);
await server.start();
await server.stop();
```

**Features:**
- No dependencies required
- Automatic index.html serving
- MIME type detection
- Directory fallback handling

#### 4. **ProjectManager** (`lib/project_manager.js`)
Unified interface for managing multiple projects.

```javascript
const { ProjectManager } = require('./lib/project_manager');

const manager = new ProjectManager();

// Load a project
const project = await manager.loadProject('/path/to/project');

// Start the dev server
const result = await manager.startProject('/path/to/project');
// Returns: { success, projectPath, framework, port, url, type }

// Get project status
const status = manager.getProjectStatus('/path/to/project');

// Stop the server
await manager.stopProject('/path/to/project');

// Get all projects
const projects = manager.getAllProjects();
```

#### 5. **WebAppPlayer** (`src/modules/web_app_player.js`)
UI components for the web app player interface.

```javascript
const WebAppPlayer = require('./src/modules/web_app_player');

const player = new WebAppPlayer();

// Create UI components
const browser = player.createProjectBrowser();
const status = player.createServerStatus(project);
const console = player.createConsolePanel(project);

// Listen to events
player.on('project-start', ({ projectPath }) => {
  // Handle start
});

player.on('project-stop', ({ projectPath }) => {
  // Handle stop
});

// Update UI
player.updateProjectList(projects);
player.updateConsoleOutput(projectPath, output);
```

## Integration Steps

### Step 1: Add IPC Handlers in main.js

```javascript
const { ProjectManager } = require('./lib/project_manager');
const projectManager = new ProjectManager();

ipcMain.handle('project:load', async (event, projectPath) => {
  try {
    const project = await projectManager.loadProject(projectPath);
    return { success: true, project };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('project:start', async (event, projectPath) => {
  try {
    const result = await projectManager.startProject(projectPath);
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('project:stop', async (event, projectPath) => {
  try {
    await projectManager.stopProject(projectPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('project:status', (event, projectPath) => {
  const status = projectManager.getProjectStatus(projectPath);
  return status;
});

ipcMain.handle('project:output', (event, projectPath) => {
  const output = projectManager.getServerOutput(projectPath);
  return output;
});
```

### Step 2: Add UI Components in app.js

```javascript
const WebAppPlayer = require('./src/modules/web_app_player');

const webAppPlayer = new WebAppPlayer();

// Create and insert UI
const projectBrowser = webAppPlayer.createProjectBrowser();
document.getElementById('web-app-container').appendChild(projectBrowser);

// Handle events
webAppPlayer.on('add-project', () => {
  // Show file picker or input dialog
});

webAppPlayer.on('load-project', async ({ projectPath }) => {
  const result = await ipcRenderer.invoke('project:load', projectPath);
  if (result.success) {
    webAppPlayer.updateProjectList([result.project]);
  }
});

webAppPlayer.on('project-start', async ({ projectPath }) => {
  const result = await ipcRenderer.invoke('project:start', projectPath);
  if (result.success) {
    // Update UI with new port/status
  }
});

webAppPlayer.on('project-stop', async ({ projectPath }) => {
  await ipcRenderer.invoke('project:stop', projectPath);
  // Update UI
});
```

### Step 3: Add HTML Structure in index.html

```html
<div class="main-content">
  <!-- Existing content -->
  
  <!-- Web App Player Section -->
  <div id="web-app-container" class="web-app-section">
    <!-- Project browser, status, console will be inserted here -->
  </div>
</div>
```

### Step 4: Update CSS

The CSS styles are already included in `src/index.css`. Key classes:
- `.web-app-browser` - Project browser container
- `.project-card` - Individual project card
- `.server-status` - Server status panel
- `.console-panel` - Console output panel
- `.project-selector` - Quick launch selector

## File Structure

```
ai/v1/aiplay/
├── lib/
│   ├── framework_detector.js    # Framework detection
│   ├── dev_server.js            # Dev server management
│   ├── project_manager.js       # Project management
│   └── ...
├── src/
│   ├── modules/
│   │   ├── web_app_player.js    # UI components
│   │   └── ...
│   ├── index.html               # Main UI
│   ├── index.css                # Styles (includes web app styles)
│   └── app.js                   # Main app logic
├── main.js                      # Electron main process
└── WEB_APP_INTEGRATION.md       # This file
```

## Supported Frameworks

### Web Apps (with dev server)
- **Next.js** - React framework with SSR
- **Astro** - Static site builder
- **Vite** - Frontend build tool
- **React** - UI library
- **Vue** - Progressive framework
- **Svelte** - Compiler framework
- **Node.js Servers** - Express, Fastify, Koa
- **Custom npm scripts** - Any project with `npm run dev`

### Websites (static)
- **Static HTML/CSS/JS** - Plain projects with index.html
- **JavaScript projects** - Projects with index.js

## Event System

The WebAppPlayer emits the following events:

```javascript
// Project lifecycle
player.on('add-project', () => {})
player.on('load-project', ({ projectPath }) => {})
player.on('project-start', ({ projectPath }) => {})
player.on('project-stop', ({ projectPath }) => {})
player.on('project-remove', ({ projectPath }) => {})

// Server actions
player.on('open-devtools', ({ projectPath }) => {})
player.on('reload-server', ({ projectPath }) => {})
player.on('view-logs', ({ projectPath }) => {})
player.on('clear-console', ({ projectPath }) => {})

// UI updates
player.updateProjectList(projects)
player.updateConsoleOutput(projectPath, output)
```

## Error Handling

All modules include comprehensive error handling:

```javascript
try {
  const project = await projectManager.loadProject(projectPath);
} catch (err) {
  console.error('Failed to load project:', err.message);
  // Display error to user
}
```

Common errors:
- `Project path does not exist`
- `Could not detect project type`
- `No dev script found in package.json`
- `Port already in use`
- `Dev server startup timeout`

## Performance Considerations

1. **Port Allocation**: Checks ports sequentially to find available one
2. **Output Streaming**: Limits console output to last 50 lines
3. **Memory**: Clears output periodically to prevent memory leaks
4. **Process Management**: Properly kills child processes on stop

## Testing

Test the integration with:

1. **Static HTML Project**
   ```
   /path/to/simple-html-project/
   ├── index.html
   ├── style.css
   └── script.js
   ```

2. **Next.js Project**
   ```
   /path/to/nextjs-app/
   ├── package.json
   ├── next.config.js
   ├── pages/
   └── public/
   ```

3. **Astro Project**
   ```
   /path/to/astro-site/
   ├── package.json
   ├── astro.config.mjs
   ├── src/
   └── public/
   ```

## Troubleshooting

### Dev server won't start
- Check that `npm install` has been run
- Verify dev script in package.json
- Check port availability

### Framework not detected
- Ensure package.json exists for web apps
- Check for framework-specific config files
- Verify project structure

### Port conflicts
- Check if port is already in use
- System will auto-allocate next available port
- Manually specify port if needed

## Future Enhancements

- [ ] Monorepo support with workspace detection
- [ ] Custom port configuration UI
- [ ] Project favorites/pinning
- [ ] Recent projects persistence
- [ ] Environment variable management
- [ ] Build script execution
- [ ] Performance profiling integration
- [ ] Remote project support
