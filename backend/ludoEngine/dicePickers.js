const { getForwardGap, getLeader } = require('./analyseBoardSituation');

// ── PEACEFUL: find the roll that clusters coins together ──────────────────────
// The previous logic inadvertently always maximized the roll (i.e. picked 6) 
// because moving forward by 6 always reduced the shortest path distance the most.
// In a peaceful state, it's best to just let the game flow naturally with a random roll.
function pickDice_Peaceful(players) {
  return Math.floor(Math.random() * 6) + 1;
}

// ── TENSE: find the roll with highest drama (captures + threats + blockades) ──
function pickDice_Tense(players) {
  let bestRolls = [];
  let bestDramaScore = -Infinity;

  for (let roll = 1; roll <= 6; roll++) {
    let dramaScore = 0;

    players.forEach(player => {
      player.coins.filter(c => c.isActive && !c.isFinished).forEach(coin => {
        
        // Handle main track logic
        if (coin.status === 'main' || coin.status === 'base') {
          // If in base, pretend it moves to start pos. For simplicity, let's just evaluate main track for now
          if (coin.status === 'main') {
            const newPos = (coin.absolutePosition + roll) % 52;
            
            players.forEach(enemy => {
              if (enemy.id === player.id) return;
              enemy.coins.filter(c => c.status === 'main').forEach(enemyCoin => {
                // Direct capture
                if (newPos === enemyCoin.absolutePosition && !enemyCoin.isOnSafeTile) {
                  dramaScore += 30;
                }
                // Near threat (1-3 steps behind enemy) -> means gap from newPos to enemy is 1-3
                const gap = getForwardGap(newPos, enemyCoin.absolutePosition);
                if (gap >= 1 && gap <= 3) {
                  dramaScore += (4 - gap) * 10;
                }
              });
            });
            
            // Penalty for running to safe tile
            // We don't have isSafeZone here directly, but we know if it matches any safe tile. 
            // In our adapter we can pass an array of safe zones, but we can also just check if the newPos matches any existing safe tile from other coins if we wanted.
            // For now, omit or add simple logic if needed. Let's just use blockade logic.
          }
        }

        // Blockade with teammate (using distance)
        player.coins.forEach(other => {
          if (other.id === coin.id || !other.isActive || other.isFinished) return;
          const expectedNewDistance = coin.distance + roll;
          if (Math.abs(expectedNewDistance - other.distance) === 0) dramaScore += 15;
        });

      });
    });

    if (dramaScore > bestDramaScore) {
      bestDramaScore = dramaScore;
      bestRolls = [roll];
    } else if (dramaScore === bestDramaScore) {
      bestRolls.push(roll);
    }
  }
  return bestRolls[Math.floor(Math.random() * bestRolls.length)];
}

// ── CRITICAL: find the roll that lets hunters catch the leader ────────────────
function pickDice_Critical(players) {
  const leader = getLeader(players);
  let bestRolls = [];
  let bestHuntScore = -Infinity;

  for (let roll = 1; roll <= 6; roll++) {
    let huntScore = 0;

    players.forEach(player => {
      if (player.id === leader.id) return;
      
      player.coins.filter(c => c.status === 'main').forEach(coin => {
        const newPos = (coin.absolutePosition + roll) % 52;
        
        leader.coins.filter(c => c.status === 'main').forEach(lc => {
          if (newPos === lc.absolutePosition && !lc.isOnSafeTile) {
             huntScore += 50;
          }
          const gap = getForwardGap(newPos, lc.absolutePosition);
          if (gap >= 1 && gap <= 2) {
             huntScore += 20;
          }
        });
      });
    });

    if (huntScore > bestHuntScore) {
      bestHuntScore = huntScore;
      bestRolls = [roll];
    } else if (huntScore === bestHuntScore) {
      bestRolls.push(roll);
    }
  }
  return bestRolls[Math.floor(Math.random() * bestRolls.length)];
}

module.exports = {
  pickDice_Peaceful,
  pickDice_Tense,
  pickDice_Critical
};
