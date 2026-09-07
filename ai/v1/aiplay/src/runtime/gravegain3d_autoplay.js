/**
 * Specialized Autoplay Heuristic for GraveGain 3D (FPS / Roguelike RPG)
 * Enables AIPlay to autonomously navigate menus, select character/class,
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

          let playerInfo = null;
          let enemiesInfo = [];
          let nearestEnemy = null;
          let nearestLoot = null;

          if (gg && gg.player) {
            playerInfo = {
              x: gg.player.x,
              y: gg.player.y,
              hp: gg.player.hp,
              maxHp: gg.player.maxHp,
              stamina: gg.player.stamina,
              potions: gg.player.potions || 0,
              level: gg.player.level,
              kills: gg.kills || 0,
              gold: gg.gold || 0,
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

          return {
            isMainMenuVisible,
            isCharSelectVisible,
            isLevelUpVisible,
            isGameOverVisible,
            isInDungeon,
            player: playerInfo,
            nearestEnemy,
            nearestLoot,
            totalEnemies: enemiesInfo.length
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
        action: { type: 'click', target: '.perk-card button, .perk-card' }
      };
    }

    // 2. Game Over screen active -> Click Try Again / Return
    if (gameState.isGameOverVisible) {
      return {
        status: 'game_over',
        reasoning: 'Autoplay: Reviving after defeat via Try Again button',
        action: { type: 'click', target: '#btnTryAgain, #btnGameOverReturn' }
      };
    }

    // 3. Main Menu screen active -> Click Endless Dungeon Run
    if (gameState.isMainMenuVisible) {
      return {
        status: 'menu',
        reasoning: 'Autoplay: Clicking Endless Dungeon Run button from Main Menu',
        action: { type: 'click', target: '#btnPlay' }
      };
    }

    // 4. Character Selection screen active -> Choose race/class and deploy
    if (gameState.isCharSelectVisible) {
      return {
        status: 'char_select',
        reasoning: 'Autoplay: Launching infiltrator quick run via Start Dungeon Run',
        action: { type: 'click', target: '#btnStartRun, .char-card' }
      };
    }

    // 5. In Dungeon Gameplay
    if (gameState.isInDungeon && gameState.player) {
      const p = gameState.player;
      const enemy = gameState.nearestEnemy;

      // Check health threshold for potion consumption
      if (p.hp < p.maxHp * 0.45 && p.potions > 0) {
        return {
          status: 'playing',
          reasoning: `Autoplay: Low health (${Math.round(p.hp)}/${p.maxHp}), drinking healing potion (Key Q)`,
          action: { type: 'press_key', target: 'q' }
        };
      }

      // If an enemy is within engagement range
      if (enemy) {
        if (enemy.dist < 70) {
          // Melee strike distance: attack!
          const useAbility = Math.random() < 0.25;
          if (useAbility) {
            return {
              status: 'playing',
              reasoning: `Autoplay: Close combat with ${enemy.name} (${Math.round(enemy.dist)}px)! Unleashing class ability (F)`,
              action: { type: 'press_key', target: 'f' }
            };
          } else {
            return {
              status: 'playing',
              reasoning: `Autoplay: Engaging ${enemy.name} at close range (${Math.round(enemy.dist)}px)! Striking weapon`,
              action: { type: 'press_key', target: ' ' }
            };
          }
        } else if (enemy.dist < 320) {
          // Advance towards enemy
          const moveKey = Math.random() < 0.8 ? 'w' : (Math.random() < 0.5 ? 'a' : 'd');
          return {
            status: 'playing',
            reasoning: `Autoplay: Closing distance to ${enemy.name} (${Math.round(enemy.dist)}px away) pressing ${moveKey.toUpperCase()}`,
            action: { type: 'hold_key', target: moveKey, duration_ms: 220 }
          };
        }
      }

      // Exploration / Loot sweep
      const wanderKeys = ['w', 'w', 'a', 'd', 's'];
      const chosenKey = wanderKeys[Math.floor(Math.random() * wanderKeys.length)];
      return {
        status: 'playing',
        reasoning: `Autoplay: Navigating dungeon corridor (Floor Layer, Gold: ${p.gold}) pressing ${chosenKey.toUpperCase()}`,
        action: { type: 'hold_key', target: chosenKey, duration_ms: 250 }
      };
    }

    // Fallback: Click center or press space
    return {
      status: 'exploring',
      reasoning: 'Autoplay: Generic exploration fallback',
      action: { type: 'press_key', target: ' ' }
    };

  } catch (err) {
    console.error('[GraveGain3D Autoplay] Heuristic run error:', err);
    return null;
  }
}

module.exports = {
  runGraveGain3DAutoplay
};
