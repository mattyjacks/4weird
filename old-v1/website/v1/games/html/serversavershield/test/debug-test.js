// Automated Debug Test for Server Saver Shield
// Run with: npx playwright test debug-test.js

const { test, expect } = require('@playwright/test');

test.describe('Visual Debug Tests', () => {
  test('canvas renders with content', async ({ page }) => {
    // Load the game
    await page.goto('http://localhost:8080/games/html/serversavershield/index.html');
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-results/01-initial-load.png' });
    
    // Check if canvas exists
    const canvas = await page.locator('#gameCanvas');
    await expect(canvas).toBeVisible();
    
    // Check canvas dimensions
    const canvasBox = await canvas.boundingBox();
    console.log('Canvas dimensions:', canvasBox);
    expect(canvasBox.width).toBeGreaterThan(0);
    expect(canvasBox.height).toBeGreaterThan(0);
    
    // Wait a moment for JS to initialize
    await page.waitForTimeout(2000);
    
    // Take screenshot after init
    await page.screenshot({ path: 'test-results/02-after-init.png' });
    
    // Check for start screen
    const startScreen = await page.locator('#startScreen');
    const isVisible = await startScreen.isVisible();
    console.log('Start screen visible:', isVisible);
    
    // Get computed styles
    const styles = await page.evaluate(() => {
      const canvas = document.getElementById('gameCanvas');
      const wrapper = document.querySelector('.game-wrapper');
      const startScreen = document.getElementById('startScreen');
      
      return {
        canvas: {
          display: window.getComputedStyle(canvas).display,
          visibility: window.getComputedStyle(canvas).visibility,
          opacity: window.getComputedStyle(canvas).opacity,
          width: canvas.width,
          height: canvas.height,
          offsetWidth: canvas.offsetWidth,
          offsetHeight: canvas.offsetHeight
        },
        wrapper: {
          display: window.getComputedStyle(wrapper).display,
          height: window.getComputedStyle(wrapper).height,
          minHeight: window.getComputedStyle(wrapper).minHeight
        },
        startScreen: {
          display: window.getComputedStyle(startScreen).display,
          visibility: window.getComputedStyle(startScreen).visibility,
          opacity: window.getComputedStyle(startScreen).opacity,
          zIndex: window.getComputedStyle(startScreen).zIndex
        }
      };
    });
    
    console.log('Computed styles:', JSON.stringify(styles, null, 2));
    
    // Check console logs
    const logs = [];
    page.on('console', msg => {
      logs.push({
        type: msg.type(),
        text: msg.text()
      });
    });
    
    // Wait a bit more
    await page.waitForTimeout(1000);
    
    console.log('Console logs:', logs);
    
    // Verify start screen should be visible
    expect(styles.startScreen.display).toBe('flex');
    expect(styles.startScreen.visibility).toBe('visible');
    expect(styles.startScreen.opacity).toBe('1');
  });
  
  test('all required elements exist', async ({ page }) => {
    await page.goto('http://localhost:8080/games/html/serversavershield/index.html');
    
    // Check all critical elements
    const elements = [
      '#gameCanvas',
      '#startScreen',
      '#btnStart',
      '.game-wrapper',
      '.hud',
      '#hudScore',
      '#hudWave'
    ];
    
    for (const selector of elements) {
      const element = await page.locator(selector);
      await expect(element, `Element ${selector} should exist`).toHaveCount(1);
      console.log(`✓ ${selector} exists`);
    }
  });
  
  test('canvas has proper context', async ({ page }) => {
    await page.goto('http://localhost:8080/games/html/serversavershield/index.html');
    
    const hasContext = await page.evaluate(() => {
      const canvas = document.getElementById('gameCanvas');
      const ctx = canvas.getContext('2d');
      
      // Try to draw something
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 50, 50);
      
      // Check if pixel was drawn
      const pixel = ctx.getImageData(25, 25, 1, 1).data;
      return {
        hasContext: !!ctx,
        pixelRed: pixel[0],
        pixelGreen: pixel[1],
        pixelBlue: pixel[2],
        pixelAlpha: pixel[3]
      };
    });
    
    console.log('Canvas context test:', hasContext);
    expect(hasContext.hasContext).toBe(true);
    expect(hasContext.pixelRed).toBe(255); // Should be red
  });
  
  test('no JavaScript errors on load', async ({ page }) => {
    const errors = [];
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('http://localhost:8080/games/html/serversavershield/index.html');
    await page.waitForTimeout(3000);
    
    console.log('Errors found:', errors);
    expect(errors.length).toBe(0);
  });
});
