const { canMove, getLeader, getForwardGap } = require('./analyseBoardSituation');

// ── PEACEFUL: move the coin that gets closest to enemies ─────────────────────
function selectMove_Peaceful(currentPlayer, roll, players) {
  let bestCoin = null;
  let bestHeat = -Infinity;

  currentPlayer.coins.forEach(coin => {
    if (!canMove(coin, roll)) return;
    
    // We only care about heat on the main track
    if (coin.status === 'main' || coin.status === 'base') {
       // if base, assume it enters start position on main track. Since we don't have it here, we will just use 0 if base. 
       // but actual absolute pos depends on colorIndex, which we don't have in this minimal model.
       // We'll skip base to main heat calculation for simplicity unless we have the colorIndex.
       if (coin.status === 'main') {
          const newPos = (coin.absolutePosition + roll) % 52;
          let heat = 0;
          
          players.forEach(enemy => {
            if (enemy.id === currentPlayer.id) return;
            enemy.coins.filter(c => c.status === 'main').forEach(ec => {
              const dist1 = getForwardGap(newPos, ec.absolutePosition);
              const dist2 = getForwardGap(ec.absolutePosition, newPos);
              const dist = Math.min(dist1, dist2);
              if (dist <= 6) heat += (7 - dist);
            });
          });

          if (heat > bestHeat) { bestHeat = heat; bestCoin = coin; }
       }
    }
  });

  return bestCoin || currentPlayer.coins.find(c => canMove(c, roll));
}

// ── TENSE: prioritise capture > threat > escape ───────────────────────────────
function selectMove_Tense(currentPlayer, roll, players) {
  let bestCoin = null;
  let bestScore = -Infinity;

  currentPlayer.coins.forEach(coin => {
    if (!canMove(coin, roll)) return;
    let score = 0;

    if (coin.status === 'main') {
      const newPos = (coin.absolutePosition + roll) % 52;
      
      // Priority 1: capture enemy right now
      players.forEach(enemy => {
        if (enemy.id === currentPlayer.id) return;
        enemy.coins.filter(c => c.status === 'main').forEach(ec => {
          if (newPos === ec.absolutePosition && !ec.isOnSafeTile) score += 100;
        });
      });

      // Priority 2: land right behind a vulnerable enemy
      players.forEach(enemy => {
        if (enemy.id === currentPlayer.id) return;
        enemy.coins.filter(c => c.status === 'main').forEach(ec => {
          const gap = getForwardGap(newPos, ec.absolutePosition);
          if (gap >= 1 && gap <= 3 && !ec.isOnSafeTile) score += (4 - gap) * 40;
        });
      });

      // Priority 3: escape if this coin is being chased
      const isThreatened = players.some(enemy =>
        enemy.id !== currentPlayer.id &&
        enemy.coins.some(ec => {
          if (ec.status !== 'main') return false;
          const gap = getForwardGap(ec.absolutePosition, coin.absolutePosition);
          return gap >= 1 && gap <= 6;
        })
      );
      // Let's assume moving it relieves pressure
      if (isThreatened) score += 60;
    } else {
       // if not main, maybe it's in homestretch. Getting closer to home is good.
       score += 10; 
    }

    if (score > bestScore) { bestScore = score; bestCoin = coin; }
  });

  return bestCoin || currentPlayer.coins.find(c => canMove(c, roll));
}

// ── CRITICAL: leader runs for home, hunters chase leader ─────────────────────
function selectMove_Critical(currentPlayer, roll, players) {
  const leader = getLeader(players);
  let bestCoin = null;
  let bestScore = -Infinity;

  currentPlayer.coins.forEach(coin => {
    if (!canMove(coin, roll)) return;
    let score = 0;

    if (currentPlayer.id === leader.id) {
      // Leader: advance as fast as possible
      score = coin.distance + roll;
    } else {
      // Hunter: close the gap on the leader's coins
      if (coin.status === 'main') {
        const newPos = (coin.absolutePosition + roll) % 52;
        leader.coins.filter(c => c.status === 'main').forEach(lc => {
          if (newPos === lc.absolutePosition && !lc.isOnSafeTile) score += 200;
          const gap = getForwardGap(newPos, lc.absolutePosition);
          if (gap >= 0 && gap <= 3) score += (4 - gap) * 30;
        });
      }
    }

    if (score > bestScore) { bestScore = score; bestCoin = coin; }
  });

  return bestCoin || currentPlayer.coins.find(c => canMove(c, roll));
}

module.exports = {
  selectMove_Peaceful,
  selectMove_Tense,
  selectMove_Critical
};
