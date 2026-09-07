/**
 * 4weird AIPlay - CAPTCHA Detection & Human-in-the-Loop (HITL) Monitor
 * Detects Cloudflare Turnstile, Google reCAPTCHA, hCaptcha, and challenge barriers.
 */

class CaptchaDetector {
  constructor() {
    this.knownSelectors = [
      // Cloudflare Turnstile & Challenges
      'iframe[src*="challenges.cloudflare.com"]',
      'iframe[src*="turnstile"]',
      '#cf-challenge-running',
      '#cf-turnstile-container',
      '.cf-turnstile',
      // Google reCAPTCHA
      'iframe[src*="google.com/recaptcha"]',
      'iframe[src*="recaptcha/api2"]',
      '.g-recaptcha',
      '#g-recaptcha-response',
      // hCaptcha
      'iframe[src*="hcaptcha.com"]',
      '.h-captcha',
      // AWS WAF Captcha
      '#aws-waf-captcha',
      'iframe[src*="awswaf"]',
      // Generic challenge wrappers
      '[data-captcha]',
      '.captcha-box',
      '#captcha-container'
    ];
  }

  /**
   * Evaluates whether a CAPTCHA or verification barrier is currently active in the DOM.
   * @param {Object} controller GameController or adapter with executeJS
   * @param {Object} webview Webview instance or null
   * @returns {Promise<{detected: boolean, type: string, selector: string}>}
   */
  async checkDOMForCaptcha(controller, webview) {
    if (!controller || typeof controller.executeJS !== 'function') {
      return { detected: false, type: 'none', selector: null };
    }

    const script = `
      (() => {
        const selectors = ${JSON.stringify(this.knownSelectors)};
        for (const sel of selectors) {
          const match = document.querySelector(sel);
          if (match) {
            const rect = match.getBoundingClientRect();
            const style = window.getComputedStyle(match);
            const isVisible = (rect.width > 10 && rect.height > 10) || 
                              style.display !== 'none';
            if (isVisible) {
              let type = 'Generic CAPTCHA';
              if (sel.includes('cloudflare') || sel.includes('cf-')) type = 'Cloudflare Turnstile';
              else if (sel.includes('recaptcha')) type = 'Google reCAPTCHA';
              else if (sel.includes('hcaptcha')) type = 'hCaptcha';
              else if (sel.includes('waf')) type = 'AWS WAF Challenge';
              return { detected: true, type, selector: sel };
            }
          }
        }
        return { detected: false, type: 'none', selector: null };
      })()
    `;

    try {
      const res = await controller.executeJS(webview, script);
      return res || { detected: false, type: 'none', selector: null };
    } catch (e) {
      return { detected: false, type: 'none', selector: null };
    }
  }

  /**
   * Polls DOM until the CAPTCHA is cleared or solved by the user.
   */
  async waitForResolution(controller, webview, timeoutMs = 60000, pollIntervalMs = 800) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const status = await this.checkDOMForCaptcha(controller, webview);
      if (!status.detected) {
        return { resolved: true, elapsedMs: Date.now() - startTime };
      }
      await new Promise(res => setTimeout(res, pollIntervalMs));
    }
    return { resolved: false, elapsedMs: Date.now() - startTime, timedOut: true };
  }
}

module.exports = {
  CaptchaDetector
};
