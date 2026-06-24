const { getForwardGap, getLeader } = require('./analyseBoardSituation');

// ── PEACEFUL: find the roll that clusters coins together ──────────────────────
function pickDice_Peaceful(players) {
  let bestRoll = Math.floor(Math.random() * 6) + 1;
  let bestProximityGain = -Infinity;

  for (let roll = 1; roll <= 6; roll++) {
    let proximityGain = 0;

    players.forEach(player => {
      player.coins.filter(c => c.status === 'main').forEach(coin => {
        const newPos = (coin.absolutePosition + roll) % 52;
        
        players.forEach(enemy => {
          if (enemy.id === player.id) return;
          enemy.coins.filter(c => c.status === 'main').forEach(enemyCoin => {
            // How far is enemy from coin currently?
            const oldDist1 = getForwardGap(coin.absolutePosition, enemyCoin.absolutePosition);
            const oldDist2 = getForwardGap(enemyCoin.absolutePosition, coin.absolutePosition);
            const oldDist = Math.min(oldDist1, oldDist2); // shortest path distance

            // How far will enemy be after move?
            const newDist1 = getForwardGap(newPos, enemyCoin.absolutePosition);
            const newDist2 = getForwardGap(enemyCoin.absolutePosition, newPos);
            const newDist = Math.min(newDist1, newDist2);

            proximityGain += (oldDist - newDist);
          });
        });
      });
    });

    // Add some randomness to tie-breaks
    if (proximityGain > bestProximityGain || (proximityGain === bestProximityGain && Math.random() > 0.5)) {
      bestProximityGain = proximityGain;
      bestRoll = roll;
    }
  }
  return bestRoll;
}

// ── TENSE: find the roll with highest drama (captures + threats + blockades) ──
function pickDice_Tense(players) {
  let bestRoll = Math.floor(Math.random() * 6) + 1;
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

    if (dramaScore > bestDramaScore || (dramaScore === bestDramaScore && Math.random() > 0.5)) {
      bestDramaScore = dramaScore;
      bestRoll = roll;
    }
  }
  return bestRoll;
}

// ── CRITICAL: find the roll that lets hunters catch the leader ────────────────
function pickDice_Critical(players) {
  const leader = getLeader(players);
  let bestRoll = Math.floor(Math.random() * 6) + 1;
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

    if (huntScore > bestHuntScore || (huntScore === bestHuntScore && Math.random() > 0.5)) {
      bestHuntScore = huntScore;
      bestRoll = roll;
    }
  }
  return bestRoll;
}

module.exports = {
  pickDice_Peaceful,
  pickDice_Tense,
  pickDice_Critical
};
