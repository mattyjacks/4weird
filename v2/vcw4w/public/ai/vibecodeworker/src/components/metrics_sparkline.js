/**
 * Real-time Canvas Sparkline Renderer for Performance Metrics
 */

function drawSparkline(canvas, val, maxRange, historyArr) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  historyArr.push(val);
  if (historyArr.length > 20) historyArr.shift();
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#00ff66';
  
  const step = canvas.width / 19;
  historyArr.forEach((h, idx) => {
    const x = idx * step;
    const y = canvas.height - (h / maxRange) * canvas.height;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

module.exports = {
  drawSparkline
};
