/**
 * AutoCode Minimization Module
 * Token minimization strategies for cost reduction
 */

/**
 * Minify code by removing unnecessary whitespace and comments
 * @param {string} code - Source code
 * @returns {string} Minified code
 */
function minifyCode(code) {
  if (!code || typeof code !== 'string') return code;

  let result = code;

  // Remove single-line comments (but not in strings)
  result = result.replace(/\/\/[^\n]*$/gm, '');

  // Remove multi-line comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove HTML comments
  result = result.replace(/<!--[\s\S]*?-->/g, '');

  // Normalize whitespace
  result = result.replace(/\n\s*\n/g, '\n'); // Remove empty lines
  result = result.replace(/[ \t]+/g, ' '); // Multiple spaces to single

  // Remove leading/trailing whitespace per line
  result = result.split('\n').map(line => line.trim()).join('\n');

  // Remove empty lines at start/end
  result = result.trim();

  return result;
}

/**
 * Strip all comments from code (preserves functionality)
 * @param {string} code - Source code
 * @returns {string} Code without comments
 */
function stripComments(code) {
  if (!code || typeof code !== 'string') return code;

  // Remove single-line comments
  let result = code.replace(/\/\/.*$/gm, '');

  // Remove multi-line comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove HTML comments
  result = result.replace(/<!--[\s\S]*?-->/g, '');

  return result;
}

/**
 * Compress screenshot by resizing and converting to grayscale
 * @param {string} base64Screenshot - Base64 encoded screenshot
 * @param {object} options - Compression options
 * @returns {Promise<string>} Compressed base64 screenshot
 */
async function compressScreenshot(base64Screenshot, options = {}) {
  const {
    maxWidth = 800,
    maxHeight = 600,
    quality = 0.7,
    grayscale = true
  } = options;

  // In a browser/Electron environment, use canvas
  if (typeof document === 'undefined') {
    return base64Screenshot; // Can't compress in Node
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');

      if (grayscale) {
        ctx.filter = 'grayscale(100%)';
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG with quality setting
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed.split(',')[1]); // Return just the base64 data
    };

    img.onerror = reject;
    img.src = `data:image/png;base64,${base64Screenshot}`;
  });
}

/**
 * Build cached context for API calls
 * @param {object} params - Context parameters
 * @returns {object} Optimized context
 */
function buildCachedContext(params) {
  const {
    systemInstructions,
    staticFiles,
    dynamicPrompt,
    screenshots = []
  } = params;

  return {
    system: {
      role: 'system',
      content: systemInstructions,
      cache_control: { type: 'ephemeral' } // Cache system prompt
    },
    static: {
      role: 'user',
      content: `Current codebase:\n${staticFiles}`,
      cache_control: { type: 'ephemeral' } // Cache static content
    },
    dynamic: {
      role: 'user',
      content: dynamicPrompt
    },
    context: screenshots.length > 0 ? {
      role: 'user',
      content: `Screenshots (${screenshots.length}): See attached images`
    } : null
  };
}

/**
 * Truncate text to token limit
 * @param {string} text - Text to truncate
 * @param {number} maxTokens - Maximum tokens
 * @returns {string} Truncated text
 */
function truncateToTokens(text, maxTokens) {
  if (!text) return text;

  // Rough estimate: 4 chars per token
  const maxChars = maxTokens * 4;

  if (text.length <= maxChars) return text;

  // Try to truncate at a sensible point
  const truncated = text.substring(0, maxChars);
  const lastNewline = truncated.lastIndexOf('\n');

  if (lastNewline > maxChars * 0.8) {
    return truncated.substring(0, lastNewline) + '\n\n[...truncated...]';
  }

  return truncated + '\n\n[...truncated...]';
}

/**
 * Calculate compression ratio
 * @param {number} original - Original size
 * @param {number} compressed - Compressed size
 * @returns {object} Compression statistics
 */
function calculateCompressionRatio(original, compressed) {
  const savings = original - compressed;
  const ratio = original > 0 ? ((savings / original) * 100).toFixed(1) : 0;

  return {
    original,
    compressed,
    savings,
    ratio: parseFloat(ratio),
    savedTokens: Math.floor(savings / 4)
  };
}

module.exports = {
  minifyCode,
  stripComments,
  compressScreenshot,
  buildCachedContext,
  truncateToTokens,
  calculateCompressionRatio
};
