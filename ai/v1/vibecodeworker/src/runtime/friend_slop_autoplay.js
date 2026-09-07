/**
 * Specialized Autoplay Heuristic for FriendSlop Game
 */

async function runFriendSlopAutoplay(webviewElement) {
  try {
    const gameState = await webviewElement.executeJavaScript(`
      (() => {
        if (typeof game === 'undefined') return null;
        return {
          state: game.state,
          playerX: game.players && game.players.length > 0 ? (game.players[0].x + game.players[0].width / 2) : 400,
          slops: game.slop ? game.slop.map(s => ({ x: s.x + s.width / 2, y: s.y + s.height / 2, speed: s.speed })) : [],
          hazards: game.hazards ? game.hazards.map(h => ({ x: h.x + h.width / 2, y: h.y + h.height / 2 })) : [],
          friends: game.friends ? game.friends.map(f => ({ x: f.x + f.width / 2, y: f.y + f.height / 2 })) : []
        };
      })()
    `);

    if (!gameState) return null;

    let type = 'wait';
    let target = '';
    let reasoning = 'Autoplay: waiting...';

    if (gameState.state === 'start') {
      type = 'click';
      target = '#friendslop-4weird-start-btn';
      reasoning = 'Autoplay: Clicking Single Player start button';
    } else if (gameState.state === 'game_over') {
      type = 'click';
      target = '#friendslop-4weird-play-again-btn';
      reasoning = 'Autoplay: Clicking Play Again button';
    } else if (gameState.state === 'paused') {
      type = 'click';
      target = '#friendslop-4weird-resume-btn';
      reasoning = 'Autoplay: Clicking Resume button';
    } else if (gameState.state === 'playing') {
      const validSlops = gameState.slops.filter(s => s.y < 500);
      if (validSlops.length > 0) {
        validSlops.sort((a, b) => b.y - a.y);
        const targetSlop = validSlops[0];
        const dx = targetSlop.x - gameState.playerX;
        
        if (Math.abs(dx) > 15) {
          type = 'press_key';
          target = dx < 0 ? 'ArrowLeft' : 'ArrowRight';
          reasoning = `Autoplay: Moving player towards closest falling slop at X: ${Math.round(targetSlop.x)}`;
        } else {
          type = 'press_key';
          target = ' ';
          reasoning = 'Autoplay: Aligned with slop! Throwing to feed friends!';
        }
      } else {
        if (Math.random() < 0.3) {
          type = 'press_key';
          target = ' ';
          reasoning = 'Autoplay: No slops, throwing blindly';
        } else {
          const dx = 400 - gameState.playerX;
          if (Math.abs(dx) > 20) {
            type = 'press_key';
            target = dx < 0 ? 'ArrowLeft' : 'ArrowRight';
            reasoning = 'Autoplay: Returning to center';
          } else {
            type = 'wait';
            reasoning = 'Autoplay: Idling in center';
          }
        }
      }
    }

    return {
      status: gameState.state,
      reasoning,
      action: { type, target, duration_ms: 100 }
    };
  } catch (err) {
    console.error("Autoplay script failed", err);
    return null;
  }
}

module.exports = {
  runFriendSlopAutoplay
};
