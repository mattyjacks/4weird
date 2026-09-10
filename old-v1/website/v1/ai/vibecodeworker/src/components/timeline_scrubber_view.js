/**
 * Timeline trace scrubber and replay view helpers
 */

const fs = require('fs');
const path = require('path');
const { drawHeatmapDot, clearHeatmapCanvas } = require('./scrubber_controller');

function handleTimelineScrub({ el, timelineHistory }) {
  const currentScrubIndex = parseInt(el.timelineScrubber.value);
  const frame = timelineHistory[currentScrubIndex];
  if (frame) {
    el.brainScreenshot.src = frame.screenshot.startsWith('data:')
      ? frame.screenshot
      : 'data:image/jpeg;base64,' + frame.screenshot;
    el.brainReasoning.innerHTML = `<strong>Scrubbing Tick #${currentScrubIndex}:</strong><br>${frame.reasoning}`;
    el.timelineTime.textContent = `Tick: ${currentScrubIndex + 1}/${timelineHistory.length}`;

    if (frame.action && frame.action.type === 'click') {
      drawHeatmapDot(el.heatmapCanvas, frame.action.x, frame.action.y);
    } else {
      clearHeatmapCanvas(el.heatmapCanvas);
    }
  }
}

function resumeFromScrub({ el, audio, logSystemMessage }) {
  audio.playClickSound();
  el.timelineContainer.classList.add('hidden');
  logSystemMessage("Resumed live tracking viewport.");
}

function saveReplayTrace({ replaysDir, timelineHistory, el, audio, toastNotifier, logSystemMessage }) {
  audio.playClickSound();
  logSystemMessage("Saving replay trace data...");
  const replayPath = path.join(replaysDir, `replay_${Date.now()}.json`);
  fs.writeFileSync(replayPath, JSON.stringify(timelineHistory, null, 2), 'utf8');
  el.replayStatusText.textContent = `Replay trace saved to replays directory.`;
  toastNotifier.show("Replay saved successfully!", "success");
}

module.exports = {
  handleTimelineScrub,
  resumeFromScrub,
  saveReplayTrace
};
