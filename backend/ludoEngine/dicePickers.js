const { getForwardGap, getLeader } = require('./analyseBoardSituation');

// Helper to do weighted random choice
function weightedRandom(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i + 1; // return roll 1-6
  }
  return 6;
}

// ── PEACEFUL: Fast-paced progression ──────────────────────
// If stuck in base, heavily bias towards 6. Otherwise, slightly bias towards higher numbers.
function pickDice_Peaceful(players, currentPlayer) {
  const coinsInBase = currentPlayer.coins.filter(c => c.status === 'base').length;
  const activeCoins = currentPlayer.coins.filter(c => c.isActive && !c.isFinished).length;
  
  if (coinsInBase === 4) {
    // 50% chance to roll a 6 to get the game moving quickly!
    return weightedRandom([10, 10, 10, 10, 10, 50]);
  } else if (coinsInBase > 0 && activeCoins < 2) {
    // 30% chance for a 6 if they only have 1 coin out
    return weightedRandom([10, 10, 15, 15, 20, 30]);
  }
  
  // Normal peaceful roll, slight bias towards moving fast
  return weightedRandom([10, 10, 15, 20, 20, 25]);
}

// ── TENSE: find the roll with highest drama FOR THE CURRENT PLAYER ──
function pickDice_Tense(players, currentPlayer) {
  let bestRolls = [];
  let bestDramaScore = -Infinity;

  for (let roll = 1; roll <= 6; roll++) {
    let dramaScore = 0;

    // Only evaluate the current player's moves, since they are the one rolling
    currentPlayer.coins.filter(c => c.isActive && !c.isFinished).forEach(coin => {
      if (coin.status === 'main') {
        const newPos = (coin.absolutePosition + roll) % 52;
        
        players.forEach(enemy => {
          if (enemy.id === currentPlayer.id) return;
          enemy.coins.filter(c => c.status === 'main').forEach(enemyCoin => {
            // Direct capture: massive drama
            if (newPos === enemyCoin.absolutePosition && !enemyCoin.isOnSafeTile) {
              dramaScore += 100;
            }
            // Near threat: landing 1-3 steps right behind an enemy
            const gap = getForwardGap(newPos, enemyCoin.absolutePosition);
            if (gap >= 1 && gap <= 3) {
              dramaScore += (4 - gap) * 15;
            }
          });
        });
      }

      // Blockade / Tag-team with own teammate
      currentPlayer.coins.forEach(other => {
        if (other.id === coin.id || !other.isActive || other.isFinished) return;
        const expectedNewDistance = coin.distance + roll;
        if (Math.abs(expectedNewDistance - other.distance) === 0) dramaScore += 20; // Landing on same tile forms a blockade
      });
    });
    
    // Add a baseline random fuzziness so it's not 100% predictable
    dramaScore += Math.random() * 10;

    if (dramaScore > bestDramaScore) {
      bestDramaScore = dramaScore;
      bestRolls = [roll];
    } else if (dramaScore === bestDramaScore) {
      bestRolls.push(roll);
    }
  }
  
  // If no dramatic moves are found (e.g. all scores are just the random fuzz), fallback to Peaceful logic
  if (bestDramaScore < 15) {
    return pickDice_Peaceful(players, currentPlayer);
  }

  return bestRolls[Math.floor(Math.random() * bestRolls.length)];
}

// ── CRITICAL: let hunters catch the leader, or let leader escape ────────────────
function pickDice_Critical(players, currentPlayer) {
  const leader = getLeader(players);
  let bestRolls = [];
  let bestScore = -Infinity;
  const isLeader = (currentPlayer.id === leader.id);

  for (let roll = 1; roll <= 6; roll++) {
    let score = 0;

    currentPlayer.coins.filter(c => c.status === 'main').forEach(coin => {
      const newPos = (coin.absolutePosition + roll) % 52;
      
      if (!isLeader) {
        // Current player is hunting the leader
        leader.coins.filter(c => c.status === 'main').forEach(lc => {
          // Direct capture of leader
          if (newPos === lc.absolutePosition && !lc.isOnSafeTile) {
             score += 150;
          }
          // Close the gap to leader
          const gap = getForwardGap(newPos, lc.absolutePosition);
          if (gap >= 1 && gap <= 3) {
             score += (4 - gap) * 20;
          }
        });
      } else {
        // Current player IS the leader, try to run away from hunters!
        players.forEach(enemy => {
          if (enemy.id === currentPlayer.id) return;
          enemy.coins.filter(c => c.status === 'main').forEach(enemyCoin => {
            const gap = getForwardGap(enemyCoin.absolutePosition, newPos);
            // Reward larger gaps (running away)
            if (gap > 6 && gap < 12) {
              score += 30;
            } else if (gap <= 6) {
              score -= 50; // Penalty for staying within striking distance
            }
          });
        });
      }
    });
    
    score += Math.random() * 10; // fuzziness

    if (score > bestScore) {
      bestScore = score;
      bestRolls = [roll];
    } else if (score === bestScore) {
      bestRolls.push(roll);
    }
  }

  if (bestScore < 15 && !isLeader) {
    return pickDice_Tense(players, currentPlayer); // fallback
  }

  return bestRolls[Math.floor(Math.random() * bestRolls.length)];
}

module.exports = {
  pickDice_Peaceful,
  pickDice_Tense,
  pickDice_Critical
};
