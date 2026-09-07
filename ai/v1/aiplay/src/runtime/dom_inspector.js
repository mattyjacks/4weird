/**
 * Viewport DOM and Performance Metrics Inspector
 */

async function getInteractiveDOM(controller, webview) {
  const code = `
    (() => {
      const interactiveTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'CANVAS'];
      const elements = [];
      
      const all = document.querySelectorAll('*');
      for (const el of all) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const isVisible = rect.width > 0 && rect.height > 0 && 
                          style.display !== 'none' && 
                          style.visibility !== 'hidden' && 
                          style.opacity !== '0';
        
        if (!isVisible) continue;
        
        const isClickable = interactiveTags.includes(el.tagName) || 
                            el.onclick != null || 
                            el.getAttribute('role') === 'button' ||
                            window.getComputedStyle(el).cursor === 'pointer';
                            
        if (isClickable) {
          elements.push({
            tagName: el.tagName,
            id: el.id || '',
            className: el.className || '',
            innerText: (el.innerText || '').slice(0, 50).trim(),
            placeholder: el.placeholder || '',
            rect: {
              left: Math.round(rect.left),
              top: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            }
          });
        }
      }
      return elements.slice(0, 40);
    })()
  `;
  
  try {
    return await controller.executeJS(webview, code);
  } catch (e) {
    console.error("Failed to query interactive DOM elements:", e);
    return [];
  }
}

async function getPerformanceMetrics(controller, webview) {
  const code = `
    (() => {
      return {
        heapLimit: window.performance && window.performance.memory ? window.performance.memory.jsHeapSizeLimit : 0,
        heapUsed: window.performance && window.performance.memory ? window.performance.memory.usedJSHeapSize : 0,
        heapTotal: window.performance && window.performance.memory ? window.performance.memory.totalJSHeapSize : 0
      };
    })()
  `;
  try {
    return await controller.executeJS(webview, code);
  } catch (e) {
    return { heapLimit: 0, heapUsed: 0, heapTotal: 0 };
  }
}

module.exports = {
  getInteractiveDOM,
  getPerformanceMetrics
};
