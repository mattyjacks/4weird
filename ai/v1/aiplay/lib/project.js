/**
 * AutoCode Project Module
 * Multi-file project management
 */

const fs = require('fs');
const path = require('path');

class MultiFileProject {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.files = new Map();
    this.entryPoints = [];
    this.dependencies = new Map();
    this.ignoredPatterns = [
      'node_modules',
      '.git',
      'dist',
      'build',
      '*.log',
      '.DS_Store',
      'package-lock.json'
    ];
  }

  async loadProject() {
    this.files.clear();
    this.entryPoints = [];

    const files = await this.scanDirectory(this.projectPath);

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const relativePath = path.relative(this.projectPath, filePath);
        const ext = path.extname(filePath);

        this.files.set(relativePath, {
          path: relativePath,
          fullPath: filePath,
          content,
          originalContent: content,
          modified: false,
          type: this.getFileType(ext),
          size: content.length,
          lastModified: fs.statSync(filePath).mtime
        });

        if (this.isEntryPoint(relativePath)) {
          this.entryPoints.push(relativePath);
        }
      } catch (err) {
        console.warn(`Failed to load file: ${filePath}`, err);
      }
    }

    this.analyzeDependencies();
    return this.getSummary();
  }

  async scanDirectory(dir) {
    const results = [];

    const scan = (currentDir) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative(this.projectPath, fullPath);

        if (this.shouldIgnore(relativePath)) continue;

        if (entry.isDirectory()) {
          scan(fullPath);
        } else if (this.isCodeFile(entry.name)) {
          results.push(fullPath);
        }
      }
    };

    scan(dir);
    return results;
  }

  shouldIgnore(relativePath) {
    return this.ignoredPatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(relativePath);
      }
      return relativePath.includes(pattern);
    });
  }

  isCodeFile(filename) {
    const codeExtensions = ['.js', '.ts', '.html', '.css', '.json', '.jsx', '.tsx'];
    return codeExtensions.some(ext => filename.endsWith(ext));
  }

  getFileType(ext) {
    const typeMap = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.html': 'html',
      '.css': 'css',
      '.json': 'json',
      '.jsx': 'jsx',
      '.tsx': 'tsx'
    };
    return typeMap[ext] || 'unknown';
  }

  isEntryPoint(relativePath) {
    const entryPatterns = ['index.html', 'index.js', 'main.js', 'app.js', 'game.js'];
    return entryPatterns.some(pattern =>
      relativePath.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  analyzeDependencies() {
    this.dependencies.clear();

    for (const [filePath, file] of this.files) {
      const deps = this.extractDependencies(file.content, filePath);
      this.dependencies.set(filePath, deps);
    }
  }

  extractDependencies(content, filePath) {
    const deps = [];
    const dir = path.dirname(filePath);

    // JS imports
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const resolved = this.resolveImport(match[1], dir);
      if (resolved) deps.push(resolved);
    }

    // require() calls
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      const resolved = this.resolveImport(match[1], dir);
      if (resolved) deps.push(resolved);
    }

    return deps;
  }

  resolveImport(importPath, baseDir) {
    if (!importPath.startsWith('.')) return null;

    const resolved = path.normalize(path.join(baseDir, importPath));
    const extensions = ['', '.js', '.ts', '.jsx', '.tsx', '/index.js'];

    for (const ext of extensions) {
      const testPath = resolved + ext;
      if (this.files.has(testPath)) return testPath;
    }

    return null;
  }

  getFile(filePath) {
    return this.files.get(filePath) || null;
  }

  updateFile(filePath, newContent) {
    const file = this.files.get(filePath);
    if (!file) return false;

    file.content = newContent;
    file.modified = newContent !== file.originalContent;
    return true;
  }

  getModifiedFiles() {
    return Array.from(this.files.values()).filter(f => f.modified);
  }

  getAllFiles() {
    return Array.from(this.files.values());
  }

  getFileCount() {
    return this.files.size;
  }

  getSummary() {
    return {
      path: this.projectPath,
      fileCount: this.files.size,
      entryPoints: this.entryPoints,
      types: this.getFileTypeCounts(),
      totalSize: Array.from(this.files.values()).reduce((sum, f) => sum + f.size, 0)
    };
  }

  getFileTypeCounts() {
    const counts = {};
    for (const file of this.files.values()) {
      counts[file.type] = (counts[file.type] || 0) + 1;
    }
    return counts;
  }

  getRelatedFiles(filePath) {
    const related = new Set();

    // Files this file depends on
    const deps = this.dependencies.get(filePath) || [];
    deps.forEach(d => related.add(d));

    // Files that depend on this file
    for (const [path, fileDeps] of this.dependencies) {
      if (fileDeps.includes(filePath)) {
        related.add(path);
      }
    }

    return Array.from(related);
  }
}

module.exports = { MultiFileProject };
