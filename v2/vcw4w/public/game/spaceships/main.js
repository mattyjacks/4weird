// Main Entry Point - Clean and Simple
// Uses the new refactored architecture

import { SpaceGameCore } from './core.js?v=11';

class SpaceGameMain {
  constructor() {
    this.core = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) {
      console.log('Space game already initialized');
      return true;
    }

    try {
      console.log('Initializing Space Game...');
      
      // Create and initialize core
      this.core = new SpaceGameCore();
      const success = await this.core.initialize('starfield');
      
      if (success) {
        // Start the game
        this.core.start();
        this.initialized = true;
        
        // Expose for debugging
        window.spaceGameCore = this.core;
        window.spaceGameMain = this;
        
        console.log('Space Game initialized successfully');
        return true;
      } else {
        console.error('Failed to initialize Space Game');
        return false;
      }
      
    } catch (error) {
      console.error('Space Game initialization error:', error);
      return false;
    }
  }

  destroy() {
    if (this.core) {
      this.core.destroy();
      this.core = null;
    }
    this.initialized = false;
  }

  getStatus() {
    return this.core ? this.core.getStatus() : { initialized: false };
  }
}

// Auto-initialize when DOM is ready
const game = new SpaceGameMain();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => game.init());
} else {
  game.init();
}

// Expose for external use
window.SpaceGameMain = SpaceGameMain;
window.game = game;
