# Web App Player - Quick Start Guide

## What's New?

aiplay now supports playing and debugging:
- **Websites** - Static HTML/CSS/JS projects
- **Web Apps** - Modern frameworks (Next.js, Astro, React, Vue, Svelte, etc.)
- **Any File Structure** - Automatic framework detection

## Quick Start

### 1. Load a Project

```
Click "Add Project" or paste folder path:
C:\Users\YourName\Projects\my-nextjs-app
```

aiplay automatically detects:
- Framework (Next.js, Astro, etc.)
- Project type (web-app or website)
- Dev script and entry point
- Recommended port

### 2. Start the Server

```
Click "Start" button on project card
```

aiplay will:
- Launch dev server
- Find available port
- Show live output
- Display server status

### 3. Open & Debug

```
Click "Open" to view in webview
Click "DevTools" for Chrome DevTools
Click "Logs" to see server output
```

### 4. Manage

```
Click "Reload" to hot reload
Click "Stop" to stop server
Click "Remove" to remove project
```

## Supported Frameworks

| Framework | Type | Port | Detection |
|-----------|------|------|-----------|
| Next.js | Web App | 3000 | package.json: `next` |
| Astro | Web App | 3000 | package.json: `astro` |
| Vite | Web App | 5173 | package.json: `vite` |
| React | Web App | 3000 | package.json: `react` |
| Vue | Web App | 5173 | package.json: `vue` |
| Svelte | Web App | 5173 | package.json: `svelte` |
| Node.js | Web App | 3000 | package.json: `express`, `fastify`, `koa` |
| Custom npm | Web App | 3000 | package.json: `scripts.dev` |
| Static HTML | Website | 8080 | index.html exists |
| Static JS | Website | 8080 | index.js exists |

## Architecture

```
FrameworkDetector
  ↓ (detects framework)
ProjectManager
  ↓ (manages lifecycle)
DevServer / StaticServer
  ↓ (runs server)
WebAppPlayer (UI)
  ↓ (displays in UI)
User
```

## Key Features

### 🔍 Smart Detection
- Reads package.json
- Scans config files
- Identifies entry points
- Classifies project type

### ⚡ One-Click Launch
- Automatic dev server start
- Port conflict resolution
- Ready state detection
- Live output streaming

### 🎨 Beautiful UI
- Project browser with cards
- Framework badges with colors
- Server status indicator
- Live console output

### 🛠️ Developer Tools
- Chrome DevTools integration
- Hot reload support
- Server log viewing
- Performance metrics

## File Locations

```
ai/v1/aiplay/
├── lib/
│   ├── framework_detector.js    ← Framework detection
│   ├── dev_server.js            ← Server management
│   └── project_manager.js       ← Project lifecycle
├── src/
│   ├── modules/
│   │   └── web_app_player.js    ← UI components
│   ├── index.html               ← Main UI
│   └── index.css                ← Styles
├── main.js                      ← Electron main
├── WEB_APP_INTEGRATION.md       ← Integration guide
└── WEB_APP_QUICK_START.md       ← This file
```

## Common Tasks

### Load a Static Website
1. Click "Add Project"
2. Select folder with index.html
3. Click "Start"
4. Click "Open"

### Debug a Next.js App
1. Click "Add Project"
2. Select Next.js project folder
3. Click "Start" (waits for "ready on" message)
4. Click "DevTools" to open Chrome DevTools
5. Edit code, see hot reload in action

### Test Multiple Projects
1. Add Project 1 → Start
2. Add Project 2 → Start
3. Switch between them in project list
4. Each runs on different port

### View Server Output
1. Project running
2. Click "Logs" button
3. See real-time server output
4. Scroll to see history

## Troubleshooting

### "Framework not detected"
- Ensure package.json exists
- Check for config files (next.config.js, astro.config.mjs)
- Verify project structure

### "Port already in use"
- System auto-allocates next available port
- Check what's using the port
- Stop conflicting service

### "Dev server won't start"
- Run `npm install` first
- Check dev script in package.json
- Look at server output for errors

### "Can't open DevTools"
- Ensure project is running
- Check browser console for errors
- Try reloading the page

## Performance Tips

1. **Close unused projects** - Stop servers you're not using
2. **Monitor output** - Clear console periodically
3. **Use hot reload** - Don't restart server unnecessarily
4. **Check ports** - Avoid port conflicts

## Next Steps

- See `WEB_APP_INTEGRATION.md` for developer integration guide
- Visit `website/v1/web-apps.html` for full documentation
- Check `README.md` for feature overview

## Support

- GitHub Issues: https://github.com/mattyjacks/4weird/issues
- Discussions: https://github.com/mattyjacks/4weird/discussions
- Email: contact@mattyjacks.com
