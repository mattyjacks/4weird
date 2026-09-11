/**
 * Specialized Autoplay Heuristic for GraveGain 3D (FPS / Roguelike RPG)
 * Enables VibeCodeWorker to autonomously navigate menus, select character/class,
 * enter the dungeon, navigate procedural rooms, engage enemies with attacks/abilities,
 * manage potion health thresholds, and advance floors.
 */

async function runGraveGain3DAutoplay(webviewElement, executeJSHelper = null) {
  const runJS = async (code) => {
    if (executeJSHelper) return await executeJSHelper(code);
    if (webviewElement && webviewElement.executeJavaScript) {
      return await webviewElement.executeJavaScript(code);
    }
    return null;
  };

  try {
    const gameState = await runJS(`
      (() => {
        try {
          const gg = window.GraveGainGame;
          const mainMenu = document.getElementById('mainMenuScreen');
          const charSelect = document.getElementById('charSelectScreen');
          const levelUp = document.getElementById('levelUpScreen');
          const gameOver = document.getElementById('gameOverScreen');
          const gameMain = document.getElementById('gameMain');

          const isMainMenuVisible = mainMenu && !mainMenu.classList.contains('hidden');
          const isCharSelectVisible = charSelect && !charSelect.classList.contains('hidden');
          const isLevelUpVisible = levelUp && !levelUp.classList.contains('hidden');
          const isGameOverVisible = gameOver && !gameOver.classList.contains('hidden');
          const isInDungeon = gameMain && !gameMain.classList.contains('hidden') && gg && gg.player && !gg.player.isDead;

          // Menu controls live in the game window, whose dimensions can vary
          // considerably in headful playtests. Return an actual visible
          // button center in the normalized action coordinate system instead
          // of relying on a selector fallback that can land at screen center.
          const actionableCenter = (selector) => {
            const el = document.querySelector(selector);
            if (!el || el.disabled || el.classList.contains('hidden')) return null;
            const r = el.getBoundingClientRect();
            if (r.width < 2 || r.height < 2) return null;
            return {
              x: Math.max(0, Math.min(1000, Math.round(((r.left + r.width / 2) / window.innerWidth) * 1000))),
              y: Math.max(0, Math.min(1000, Math.round(((r.top + r.height / 2) / window.innerHeight) * 1000)))
            };
          };

          let playerInfo = null;
          let enemiesInfo = [];
          let nearestEnemy = null;
          let nearestLoot = null;

          if (gg && gg.player) {
            playerInfo = {
              x: gg.player.x,
              y: gg.player.y,
              yaw: gg.player.yaw ?? null,
              pitch: gg.player.pitch ?? null,
              hp: gg.player.hp,
              maxHp: gg.player.maxHp,
              stamina: gg.player.stamina,
              potions: gg.player.potions || 0,
              level: gg.player.level,
              kills: gg.kills || 0,
              gold: gg.gold || 0,
              floorIndex: gg.floorIndex ?? null,
              controlMode: gg.controlMode || 'realtime',
              isPaused: !!gg.isPaused
            };

            if (gg.enemies && gg.enemies.length > 0) {
              enemiesInfo = gg.enemies
                .filter(e => e.hp > 0)
                .map(e => ({
                  name: e.name,
                  x: e.x,
                  y: e.y,
                  hp: e.hp,
                  maxHp: e.maxHp,
                  dist: Math.hypot(e.x - gg.player.x, e.y - gg.player.y),
                  isBoss: !!e.isBoss
                }))
                .sort((a, b) => a.dist - b.dist);
              
              if (enemiesInfo.length > 0) {
                nearestEnemy = enemiesInfo[0];
              }
            }

            if (gg.loot && gg.loot.length > 0) {
              const lootList = gg.loot
                .filter(l => !l.picked)
                .map(l => ({
                  type: l.type,
                  dist: Math.hypot(l.x - gg.player.x, l.y - gg.player.y)
                }))
                .sort((a, b) => a.dist - b.dist);
              if (lootList.length > 0) {
                nearestLoot = lootList[0];
              }
            }
          }

          // GraveGain3D is a first-person 3D game: project via the THREE
          // camera through GraveGainBotInput.projectEnemy (canvas-rect
          // aware). The old 2D camera-offset path does not exist
          // here (CameraController only does shake) and mis-aimed attacks.
          let enemyScreen = null;
          try {
            if (nearestEnemy && window.GraveGainBotInput && window.GraveGainBotInput.projectEnemy) {
              enemyScreen = window.GraveGainBotInput.projectEnemy();
            }
          } catch (e) { enemyScreen = null; }

          return {
            isMainMenuVisible,
            isCharSelectVisible,
            isLevelUpVisible,
            isGameOverVisible,
            isInDungeon,
            player: playerInfo,
            nearestEnemy,
            nearestLoot,
            enemyScreen,
            totalEnemies: enemiesInfo.length,
            menuAction: actionableCenter('#btnPlay'),
            deployAction: actionableCenter('#btnCharSelectStart'),
            realtimeAction: actionableCenter('#btnModeRealtime, .btn-mode[data-mode="realtime"], .char-mode-card[data-mode="realtime"]')
          };
        } catch (e) {
          return { error: e.message };
        }
      })()
    `);

    if (!gameState || gameState.error) {
      return null;
    }

    // 1. Level Up screen active -> Pick a perk card
    if (gameState.isLevelUpVisible) {
      return {
        status: 'level_up',
        reasoning: 'Autoplay: Selecting perk card on Level Up screen',
        action: { type: 'click', target: '#perkCardsGrid .perk-card button, #perkCardsGrid .perk-card, .perk-card button, .perk-card' }
      };
    }

    // 2. Game Over screen active -> Return to menu (real id: #btnGoToMenu)
    if (gameState.isGameOverVisible) {
      return {
        status: 'game_over',
        reasoning: 'Autoplay: Returning to menu after defeat via Go-To-Menu button',
        action: { type: 'click', target: '#btnGoToMenu' }
      };
    }

    // 3. Main Menu screen active -> Click Endless Dungeon Run
    if (gameState.isMainMenuVisible) {
      if (!gameState.menuAction) return { status: 'menu', reasoning: 'Autoplay: Endless Dungeon Run control is not actionable yet', action: { type: 'wait', duration_ms: 350 } };
      return {
        status: 'menu',
        reasoning: 'Autoplay: Clicking Endless Dungeon Run button from Main Menu',
        action: { type: 'click', target: `${gameState.menuAction.x},${gameState.menuAction.y}`, params: { x: gameState.menuAction.x, y: gameState.menuAction.y } }
      };
    }

    // 4. Character Selection screen active -> Choose race/class and deploy
    // Real deploy button is #btnCharSelectStart; keep legacy ids as fallback.
    if (gameState.isCharSelectVisible) {
      if (!gameState.deployAction) return { status: 'char_select', reasoning: 'Autoplay: Deploy control is not actionable yet', action: { type: 'wait', duration_ms: 350 } };
      return {
        status: 'char_select',
        reasoning: 'Autoplay: Launching infiltrator quick run via Deploy to Dungeon',
        action: { type: 'click', target: `${gameState.deployAction.x},${gameState.deployAction.y}`, params: { x: gameState.deployAction.x, y: gameState.deployAction.y } }
      };
    }

    // 5. In Dungeon Gameplay
    if (gameState.isInDungeon && gameState.player) {
      const p = gameState.player;
      const enemy = gameState.nearestEnemy;

      // A saved run can reopen in Chrono-Lock or Turn-Based. This requested
      // session is explicitly realtime, so correct the mode before issuing
      // combat or movement inputs.
      if (p.controlMode && p.controlMode !== 'realtime') {
        if (!gameState.realtimeAction) {
          return { status: 'mode_sync', reasoning: 'Autoplay: Realtime mode control is not actionable yet', action: { type: 'wait', duration_ms: 350 } };
        }
        return {
          status: 'mode_sync',
          reasoning: `Autoplay: Switching ${p.controlMode || 'saved'} simulation to Realtime mode`,
          action: {
            type: 'click',
            target: `${gameState.realtimeAction.x},${gameState.realtimeAction.y}`,
            params: { x: gameState.realtimeAction.x, y: gameState.realtimeAction.y }
          }
        };
      }

      // Check health threshold for potion consumption
      if (p.hp < p.maxHp * 0.45 && p.potions > 0) {
        return {
          status: 'playing',
          reasoning: `Autoplay: Low health (${Math.round(p.hp)}/${p.maxHp}), drinking healing potion (Key Q)`,
          action: { type: 'press_key', target: 'q' }
        };
      }

      // GraveGain3D is first-person 3D: canvas clicks steer aim
      // (BotInput.lookToward) and fire the melee attack. F is an ability
      // key, never the primary attack, so do not substitute it for combat.
      if (enemy) {
        if (![enemy.x, enemy.y, gameState.player.x, gameState.player.y].every(Number.isFinite)) {
          return { status: 'playing', reasoning: `Autoplay: Enemy coordinates unavailable; advancing cautiously`, action: { type: 'hold_key', target: 'w', duration_ms: 180 } };
        }
        const scr = gameState.enemyScreen;
        if (enemy.dist <= 70 && scr && scr.onScreen) {
          return {
            status: 'playing',
            reasoning: `Autoplay: Melee attack on ${enemy.name} (${Math.round(enemy.dist)}px) at canvas ${scr.x},${scr.y}`,
            action: { type: 'click', target: `${scr.x},${scr.y}`, params: { x: scr.x, y: scr.y, gameAction: 'gravegain3d_attack' } }
          };
        }
        if (scr && scr.onScreen) {
          const dx = enemy.x - gameState.player.x;
          const dy = enemy.y - gameState.player.y;
          const moveKey = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'a' : 'd') : (dy < 0 ? 'w' : 's');
          return {
            status: 'playing',
            reasoning: `Autoplay: Facing ${enemy.name} and advancing ${moveKey.toUpperCase()} (${Math.round(enemy.dist)}px)`,
            action: { type: 'hold_key', target: moveKey, duration_ms: 220, params: { aimX: scr.x, aimY: scr.y } }
          };
        }
        // Enemy off-screen: close on the dominant world-axis instead of
        // wandering randomly, which was especially bad in sparse rooms.
        const dx = enemy.x - gameState.player.x;
        const dy = enemy.y - gameState.player.y;
        const moveKey = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'a' : 'd') : (dy < 0 ? 'w' : 's');
        return {
          status: 'playing',
          reasoning: `Autoplay: Closing distance to ${enemy.name} (${Math.round(enemy.dist)}px away) pressing ${moveKey.toUpperCase()}`,
          action: { type: 'hold_key', target: moveKey, duration_ms: 220 }
        };
      }

      // Exploration / loot sweep: deterministic corridor cycle persisted
      // on the page. Pure random wander re-walked the same rooms and
      // starved the frame-analysis loop of new content.
      let sweepIdx = 0;
      try {
        window.__gg3dWanderIdx = ((window.__gg3dWanderIdx || 0) + 1) % 8;
        sweepIdx = window.__gg3dWanderIdx;
      } catch (_) { sweepIdx = Math.floor(Math.random() * 8); }
      const sweepKeys = ['w', 'w', 'a', 'w', 'w', 'd', 'w', 's'];
      const chosenKey = sweepKeys[sweepIdx] || 'w';
      return {
        status: 'playing',
        reasoning: `Autoplay: Sweeping dungeon corridor [${sweepIdx + 1}/8] (Layer ${p.floorIndex ?? gameState.player.floorIndex ?? '?'}, Gold: ${p.gold}) pressing ${chosenKey.toUpperCase()}`,
        action: { type: 'hold_key', target: chosenKey, duration_ms: 300 }
      };
    }

    // Fallback: step forward with a real hold (a 50 ms 'w' tap never
    // overcomes dungeon friction; Space is jump/wait, not an attack)
    return {
      status: 'exploring',
      reasoning: 'Autoplay: Generic exploration fallback',
      action: { type: 'hold_key', target: 'w', duration_ms: 300 }
    };

  } catch (err) {
    console.error('[GraveGain3D Autoplay] Heuristic run error:', err);
    return null;
  }
}

module.exports = {
  runGraveGain3DAutoplay
};
