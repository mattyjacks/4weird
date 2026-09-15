'use strict';
/* GraveGain2dB emoji art — canonical layer order + draw dispatch.
 * Order: parallax -> static -> destructible -> props -> actors ->
 *        projectiles -> debris -> lighting -> HUD.
 * Global: window.GraveGain2dBArtLayers
 */
(function (root) {
  var LAYERS = [
    { id: 'parallax', z: 0 },
    { id: 'static', z: 1 },
    { id: 'destructible', z: 2 },
    { id: 'props', z: 3 },
    { id: 'actors', z: 4 },
    { id: 'projectiles', z: 5 },
    { id: 'debris', z: 6 },
    { id: 'lighting', z: 7 },
    { id: 'hud', z: 8 }
  ];

  var ORDER = ['parallax', 'static', 'destructible', 'props', 'actors',
    'projectiles', 'debris', 'lighting', 'hud'];

  function layerIndex(id) {
    for (var i = 0; i < ORDER.length; i++) {
      if (ORDER[i] === id) return i;
    }
    return -1;
  }

  // A stage is one frame's worth of per-layer draw queues.
  function createStage() {
    var queues = {};
    for (var i = 0; i < ORDER.length; i++) queues[ORDER[i]] = [];
    return { queues: queues };
  }

  function push(stage, layerId, item) {
    var q = stage.queues[layerId];
    if (!q) return false; // unknown layer: refuse, never mis-sort
    q.push(item);
    return true;
  }

  function clear(stage) {
    for (var i = 0; i < ORDER.length; i++) stage.queues[ORDER[i]].length = 0;
  }

  // Viewport cull helper for world layers (items carry x/y, margin in px).
  function visible(cam, viewW, viewH, x, y, margin) {
    var m = margin || 64;
    var vx = cam.x, vy = cam.y;
    return x > vx - m && x < vx + viewW + m && y > vy - m && y < vy + viewH + m;
  }

  // Draw every layer in canonical order. painters: { layerId: fn(ctx, items, cam) }.
  function drawInOrder(ctx, stage, painters, cam) {
    for (var i = 0; i < ORDER.length; i++) {
      var id = ORDER[i];
      var fn = painters[id];
      if (typeof fn === 'function') fn(ctx, stage.queues[id], cam);
    }
  }

  root.GraveGain2dBArtLayers = {
    LAYERS: LAYERS,
    ORDER: ORDER,
    layerIndex: layerIndex,
    createStage: createStage,
    push: push,
    clear: clear,
    visible: visible,
    drawInOrder: drawInOrder
  };
})(typeof window !== 'undefined' ? window : globalThis);
