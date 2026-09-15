'use strict';
/* GraveGain2dB movement lab — chase camera with lookahead + trauma shake.
 * Follows the midpoint of alive targets, looks ahead along mean velocity
 * and aim facing, clamps to level bounds, applies decaying trauma shake.
 * Global: window.GraveGain2dBPlayerCamera
 */
(function (root) {
  function createCamera(viewW, viewH) {
    return {
      viewW: viewW || 1280, viewH: viewH || 720,
      x: 0, y: 0, scale: 1,
      trauma: 0,
      lookX: 0, lookY: 0,
      shakeX: 0, shakeY: 0
    };
  }

  function addTrauma(cam, amount) {
    cam.trauma = Math.min(1, cam.trauma + amount);
  }

  // targets: [{x,y,w,h,vx,vy,facing,dead}]. bounds: {minX,minY,maxX,maxY} world.
  function follow(cam, targets, bounds, dt) {
    var alive = [];
    for (var i = 0; i < targets.length; i++) {
      if (!targets[i].dead) alive.push(targets[i]);
    }
    if (!alive.length) return cam;
    var mx = 0, my = 0, mvx = 0;
    for (var j = 0; j < alive.length; j++) {
      var t = alive[j];
      mx += t.x + t.w / 2; my += t.y + t.h / 2;
      mvx += (t.vx || 0) + (t.facing || 1) * 40;
    }
    mx /= alive.length; my /= alive.length; mvx /= alive.length;
    var wantLookX = Math.max(-140, Math.min(140, mvx * 0.35));
    var k = Math.min(1, (dt || 0.016) * 5);
    cam.lookX += (wantLookX - cam.lookX) * k;
    cam.lookY += ((my - (cam.y + cam.viewH / 2)) * 0.12 - cam.lookY) * k;
    var tx = mx + cam.lookX - cam.viewW / 2;
    var ty = my + cam.lookY - cam.viewH / 2;
    var sk = Math.min(1, (dt || 0.016) * 7);
    cam.x += (tx - cam.x) * sk;
    cam.y += (ty - cam.y) * sk;
    if (bounds) {
      var maxX = bounds.maxX - cam.viewW;
      var maxY = bounds.maxY - cam.viewH;
      if (maxX < bounds.minX) cam.x = bounds.minX;
      else cam.x = Math.max(bounds.minX, Math.min(maxX, cam.x));
      if (maxY < bounds.minY) cam.y = bounds.minY;
      else cam.y = Math.max(bounds.minY, Math.min(maxY, cam.y));
    }
    // trauma decay + shake offset (quadratic feel, zero when calm)
    cam.trauma = Math.max(0, cam.trauma - (dt || 0.016) * 1.6);
    var sh = cam.trauma * cam.trauma * 22;
    cam.shakeX = (Math.random() * 2 - 1) * sh;
    cam.shakeY = (Math.random() * 2 - 1) * sh;
    return cam;
  }

  function view(cam) {
    return { x: cam.x + cam.shakeX, y: cam.y + cam.shakeY, scale: cam.scale };
  }

  function worldToScreen(cam, x, y) {
    var v = view(cam);
    return { x: (x - v.x) * v.scale, y: (y - v.y) * v.scale };
  }

  function screenToWorld(cam, sx, sy) {
    var v = view(cam);
    return { x: v.x + sx / v.scale, y: v.y + sy / v.scale };
  }

  root.GraveGain2dBPlayerCamera = {
    createCamera: createCamera,
    addTrauma: addTrauma,
    follow: follow,
    view: view,
    worldToScreen: worldToScreen,
    screenToWorld: screenToWorld
  };
})(typeof window !== 'undefined' ? window : globalThis);
