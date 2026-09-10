// Cinematic Camera System
// Provides dynamic camera movements with multiple modes for engaging gameplay

// THREE.js is loaded globally via CDN in index.html
const THREE = window.THREE;

class CinematicCamera {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;
    
    this.mode = 'dynamic';
    this.timer = 0;
    this.switchInterval = 8.0;
    this.modes = ['chase', 'orbit', 'flyby', 'combat', 'dramatic'];
    this.currentMode = 0;
    this.smoothTransition = 0.05;
    
    this.targetPosition = new THREE.Vector3();
    this.targetLookAt = new THREE.Vector3();
    this.currentPosition = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();
    
    // Initialize current position to camera's starting position
    this.currentPosition.copy(camera.position);
    this.currentLookAt.set(0, 0, -10);
  }

  update(dt, timestamp, fleetCenter, combatInfo) {
    this.timer -= dt;
    
    // Switch camera mode periodically
    if (this.timer <= 0) {
      this.currentMode = (this.currentMode + 1) % this.modes.length;
      this.timer = this.switchInterval + Math.random() * 4.0;
      console.log('Camera mode:', this.modes[this.currentMode]);
    }
    
    const mode = this.modes[this.currentMode];
    
    // Calculate target position based on mode
    switch(mode) {
      case 'chase':
        this.updateChaseMode(fleetCenter);
        break;
      case 'orbit':
        this.updateOrbitMode(fleetCenter, timestamp);
        break;
      case 'flyby':
        this.updateFlybyMode(fleetCenter);
        break;
      case 'combat':
        this.updateCombatMode(fleetCenter, combatInfo);
        break;
      case 'dramatic':
        this.updateDramaticMode(fleetCenter, timestamp);
        break;
    }
    
    // Smooth camera transitions
    this.currentPosition.lerp(this.targetPosition, this.smoothTransition);
    this.currentLookAt.lerp(this.targetLookAt, this.smoothTransition);
    
    // Apply camera position and rotation
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
  }

  updateChaseMode(fleetCenter) {
    this.targetPosition.set(
      fleetCenter.x,
      fleetCenter.y + 15,
      fleetCenter.z + 30
    );
    this.targetLookAt.copy(fleetCenter);
  }

  updateOrbitMode(fleetCenter, timestamp) {
    const orbitAngle = timestamp * 0.0003;
    const orbitRadius = 35;
    
    this.targetPosition.set(
      fleetCenter.x + Math.cos(orbitAngle) * orbitRadius,
      fleetCenter.y + 20,
      fleetCenter.z + Math.sin(orbitAngle) * orbitRadius
    );
    this.targetLookAt.copy(fleetCenter);
  }

  updateFlybyMode(fleetCenter) {
    this.targetPosition.set(
      fleetCenter.x + 40,
      fleetCenter.y - 5,
      fleetCenter.z - 25
    );
    this.targetLookAt.copy(fleetCenter);
  }

  updateCombatMode(fleetCenter, combatInfo) {
    if (combatInfo && combatInfo.closestAlien) {
      const combatPoint = new THREE.Vector3().addVectors(
        fleetCenter, 
        combatInfo.closestAlien.position
      ).multiplyScalar(0.5);
      
      this.targetPosition.set(
        combatPoint.x + 20,
        combatPoint.y + 20,
        combatPoint.z + 20
      );
      this.targetLookAt.copy(combatPoint);
    } else {
      this.targetPosition.set(
        fleetCenter.x,
        fleetCenter.y + 18,
        fleetCenter.z + 25
      );
      this.targetLookAt.copy(fleetCenter);
    }
  }

  updateDramaticMode(fleetCenter, timestamp) {
    const dramaticAngle = timestamp * 0.0002;
    const dramaticRadius = 40;
    
    this.targetPosition.set(
      fleetCenter.x + Math.cos(dramaticAngle) * dramaticRadius,
      fleetCenter.y + 25,
      fleetCenter.z + Math.sin(dramaticAngle) * dramaticRadius
    );
    this.targetLookAt.set(
      fleetCenter.x,
      fleetCenter.y + 5,
      fleetCenter.z
    );
  }

  setMode(mode) {
    const modeIndex = this.modes.indexOf(mode);
    if (modeIndex !== -1) {
      this.currentMode = modeIndex;
      this.timer = this.switchInterval;
      console.log('Camera mode set to:', mode);
    }
  }

  getMode() {
    return this.modes[this.currentMode];
  }

  // Emergency camera shake for impacts
  shake(intensity = 0.5, duration = 500) {
    const originalPosition = this.currentPosition.clone();
    const originalLookAt = this.currentLookAt.clone();
    const startTime = Date.now();
    
    const shakeAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress < 1) {
        const shakeIntensity = intensity * (1 - progress);
        
        this.currentPosition.x = originalPosition.x + (Math.random() - 0.5) * shakeIntensity;
        this.currentPosition.y = originalPosition.y + (Math.random() - 0.5) * shakeIntensity;
        this.currentPosition.z = originalPosition.z + (Math.random() - 0.5) * shakeIntensity;
        
        this.camera.position.copy(this.currentPosition);
        this.camera.lookAt(this.currentLookAt);
        
        requestAnimationFrame(shakeAnimation);
      } else {
        this.currentPosition.copy(originalPosition);
        this.currentLookAt.copy(originalLookAt);
      }
    };
    
    shakeAnimation();
  }

  // Zoom in/out for dramatic moments
  zoom(factor, duration = 1000) {
    const originalFov = this.camera.fov;
    const targetFov = originalFov * factor;
    const startTime = Date.now();
    
    const zoomAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress < 1) {
        this.camera.fov = originalFov + (targetFov - originalFov) * progress;
        this.camera.updateProjectionMatrix();
        requestAnimationFrame(zoomAnimation);
      } else {
        this.camera.fov = targetFov;
        this.camera.updateProjectionMatrix();
      }
    };
    
    zoomAnimation();
  }

  // Focus on specific ship or point
  focusOn(target, duration = 2000) {
    const targetPos = target.position || target;
    const originalTarget = this.targetLookAt.clone();
    const startTime = Date.now();
    
    const focusAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress < 1) {
        this.targetLookAt.lerpVectors(originalTarget, targetPos, progress);
        requestAnimationFrame(focusAnimation);
      } else {
        this.targetLookAt.copy(targetPos);
      }
    };
    
    focusAnimation();
  }
}

export { CinematicCamera };
