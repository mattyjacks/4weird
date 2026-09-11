/**
 * Helper to playback recorded action sessions through an API client.
 */
async function playActionSequence(client, session) {
  if (client) {
    await client.launchGame(session.gameId);
  }

  let lastOffset = 0;
  for (const step of session.actions) {
    const waitTime = Math.max(0, step.offsetMs - lastOffset);
    if (waitTime > 0) {
      await new Promise(r => setTimeout(r, Math.min(waitTime, 5000)));
    }
    lastOffset = step.offsetMs;

    if (client && step.action) {
      if (step.action.type === 'click') {
        await client.click(step.action.x, step.action.y);
      } else if (step.action.type === 'keydown') {
        await client.pressKey(step.action.key);
      }
    }
  }

  return { success: true, session };
}

module.exports = {
  playActionSequence
};
