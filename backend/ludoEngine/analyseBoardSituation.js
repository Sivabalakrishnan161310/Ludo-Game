const TOTAL_STEPS = 56;

// Helper to determine if a move is valid
function canMove(coin, roll) {
  if (coin.status === 'home') return false;
  if (coin.status === 'base') return roll === 6;
  return (coin.distance + roll) <= TOTAL_STEPS;
}

function getLeader(players) {
  return players.reduce((best, p) => {
    const score = p.coins.reduce((s, c) => s + c.distance, 0);
    const bestScore = best.coins.reduce((s, c) => s + c.distance, 0);
    return score > bestScore ? p : best;
  });
}

// Calculate the gap in the forward direction from A to B on a circular track of 52 tiles
// Returns the number of steps required to go from posA to posB.
function getForwardGap(posA, posB) {
  return (posB - posA + 52) % 52;
}

function analyseBoardSituation(gameState) {
  const { players } = gameState;
  let scores = {
    proximityThreat: 0,
    nearHomeDanger: 0,
    blockadeOpportunity: 0,
    safeZoneExploitation: 0,
    captureOpportunity: 0,
    loneliness: 0,
    powerGap: 0
  };

  // 1. PROXIMITY THREAT (Any enemy 1-6 steps behind any coin)
  players.forEach(player => {
    player.coins.filter(c => c.status === 'main').forEach(coin => {
      players.forEach(enemy => {
        if (enemy.id === player.id) return;
        enemy.coins.filter(c => c.status === 'main').forEach(enemyCoin => {
          // How many steps from enemyCoin to coin? (enemy is behind if gap is small)
          const gap = getForwardGap(enemyCoin.absolutePosition, coin.absolutePosition);
          if (gap >= 1 && gap <= 6) {
            scores.proximityThreat += (7 - gap);
          }
        });
      });
    });
  });

  // 2. NEAR-HOME DANGER (Any coin within 8 steps of finishing)
  players.forEach(player => {
    player.coins.filter(c => c.isActive && !c.isFinished).forEach(coin => {
      const stepsLeft = TOTAL_STEPS - coin.distance;
      if (stepsLeft <= 8) {
        scores.nearHomeDanger += (9 - stepsLeft);
      }
    });
  });

  // 3. BLOCKADE OPPORTUNITY (Two same-player coins within 1 step of each other)
  players.forEach(player => {
    const active = player.coins.filter(c => c.isActive && !c.isFinished);
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const gap = Math.abs(active[i].distance - active[j].distance);
        if (gap <= 1) {
          scores.blockadeOpportunity += 10;
        }
      }
    }
  });

  // 4. SAFE ZONE EXPLOITATION (Strong coin sitting idle on safe tile)
  players.forEach(player => {
    player.coins.forEach(coin => {
      if (coin.isOnSafeTile) {
        scores.safeZoneExploitation += 8;
      }
    });
  });

  // 5. CAPTURE OPPORTUNITY (Any coin can land exactly on an enemy with roll 1-6)
  players.forEach(player => {
    player.coins.filter(c => c.status === 'main').forEach(coin => {
      players.forEach(enemy => {
        if (enemy.id === player.id) return;
        enemy.coins.filter(c => c.status === 'main').forEach(enemyCoin => {
          // How many steps from coin to enemyCoin?
          const gap = getForwardGap(coin.absolutePosition, enemyCoin.absolutePosition);
          if (gap >= 1 && gap <= 6 && !enemyCoin.isOnSafeTile) {
            scores.captureOpportunity += 15;
          }
        });
      });
    });
  });

  // 6. LONELINESS SCORE (All players spread far apart)
  const distances = players.flatMap(p => p.coins.filter(c => c.isActive).map(c => c.distance));
  if (distances.length > 1) {
    const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
    const spread = distances.reduce((sum, d) => sum + Math.abs(d - avgDist), 0);
    // Modified threshold slightly to fit 0-56 scale better
    scores.loneliness = spread > 30 ? 20 : 0; 
  }

  // 7. POWER GAP (One player way ahead)
  const playerTotals = players.map(p =>
    p.coins.reduce((sum, c) => sum + c.distance, 0)
  );
  if (playerTotals.length > 0) {
    const maxTotal = Math.max(...playerTotals);
    const minTotal = Math.min(...playerTotals);
    // Max total for a player is 56 * 4 = 224. 80 is a huge gap.
    scores.powerGap = (maxTotal - minTotal) > 80 ? 25 : 0;
  }

  // TOTAL + CLASSIFY
  const totalTension = Object.values(scores).reduce((a, b) => a + b, 0);
  let gameState_label;
  if (totalTension < 20)      gameState_label = "PEACEFUL";
  else if (totalTension < 60) gameState_label = "TENSE";
  else                        gameState_label = "CRITICAL";

  return { scores, totalTension, gameState_label };
}

module.exports = {
  TOTAL_STEPS,
  canMove,
  getLeader,
  getForwardGap,
  analyseBoardSituation
};
