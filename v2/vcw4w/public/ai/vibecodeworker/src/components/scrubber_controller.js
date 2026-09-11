/**
 * Execution Timeline & Scrubber Controller
 */

function drawHeatmapDot(canvas, x, y) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const parentWidth = canvas.parentElement.clientWidth;
  const parentHeight = canvas.parentElement.clientHeight;
  canvas.width = parentWidth;
  canvas.height = parentHeight;
  
  const scaleX = (x / 1000) * parentWidth;
  const scaleY = (y / 1000) * parentHeight;

  ctx.beginPath();
  ctx.arc(scaleX, scaleY, 12, 0, 2 * Math.PI, false);
  ctx.fillStyle = 'rgba(0, 255, 102, 0.4)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#00ff66';
  ctx.stroke();
}

function clearHeatmapCanvas(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

module.exports = {
  drawHeatmapDot,
  clearHeatmapCanvas
};
