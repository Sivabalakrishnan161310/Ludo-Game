const crypto = require('crypto');

class LudoEngine {
  constructor(players) {
    this.N = Math.max(4, players.length); // 4, 5, or 6 arms
    this.mainTrackLength = this.N * 13;
    this.travelToHomeStretch = this.mainTrackLength - 2; // Start is index 8. End of arm is 6. Distance = 13*N - 8 + 6 = N*13 - 2.

    // Initialize players with 4 tokens each
    this.players = players.map((p, index) => {
      let cIdx = index;
      // If 2 players, assign them to opposite sides of the board (Red and Yellow)
      if (players.length === 2 && index === 1) {
        cIdx = 2;
      }
      return {
        id: p.id,
        persistentId: p.persistentId,
        name: p.name,
        colorIndex: cIdx,
        tokens: [
          { id: 0, position: -1, status: 'base' }, // -1 = base, 0 to N*13-1 = main track, 100-104 = home stretch, 999 = home
          { id: 1, position: -1, status: 'base' },
          { id: 2, position: -1, status: 'base' },
          { id: 3, position: -1, status: 'base' }
        ],
        isKicked: false,
        rank: null,
        frustrationMeter: 0,
        overpowerMeter: 0
      };
    });
    this.turnIndex = 0;
    this.currentRank = 1;
    this.diceRoll = crypto.randomInt(1, 7); // Start with a random face instead of defaulting to 1
    this.consecutiveSixes = 0;
    this.state = 'waiting_for_roll'; // waiting_for_roll, waiting_for_move, finished
    this.turnDeadline = Date.now() + 45000; // 45 seconds timer
    this.lastAction = 'Game Started! Roll the dice.';
  }

  get activePlayer() {
    return this.players[this.turnIndex];
  }

  isSafeZone(pos) {
    for (let i = 0; i < this.N; i++) {
      if (pos === (i * 13 + 8)) return true;
      if (pos === (i * 13 + 16) % this.mainTrackLength) return true;
    }
    return false;
  }

  determineFlowStateRoll() {
    const player = this.activePlayer;
    const frustration = Math.min(100, Math.max(0, player.frustrationMeter || 0));
    const overpower = Math.min(100, Math.max(0, player.overpowerMeter || 0));

    // Star Power: Highly Frustrated Player (Needs a win)
    if (frustration > 60) {
      // If stuck in base, heavily favor a 6 (60% chance to force it)
      const tokensInBase = player.tokens.filter(t => t.status === 'base').length;
      if (tokensInBase > 0 && crypto.randomInt(0, 100) < 60) {
        return 6;
      }
      
      // Otherwise, see if they can capture someone and heavily favor it
      let captureRoll = null;
      const opponentTokens = [];
      this.players.forEach(p => {
        if (p.colorIndex !== player.colorIndex) {
          p.tokens.forEach(t => {
            if (t.status === 'main') opponentTokens.push(t.position);
          });
        }
      });
      player.tokens.forEach(t => {
        if (t.status === 'main') {
          for (let roll = 1; roll <= 6; roll++) {
            const startPos = player.colorIndex * 13 + 8;
            let traveled = t.position >= startPos ? (t.position - startPos) : (this.mainTrackLength - startPos + t.position);
            if (traveled + roll <= this.travelToHomeStretch) {
              const targetPos = (t.position + roll) % this.mainTrackLength;
              if (!this.isSafeZone(targetPos) && opponentTokens.includes(targetPos)) {
                captureRoll = roll;
              }
            }
          }
        }
      });

      if (captureRoll && crypto.randomInt(0, 100) < 60) {
        return captureRoll; // Force the capture roll!
      }
    }

    // Blue Shell: Overpowered Player (Needs a nerf)
    if (overpower > 70) {
      // 50% chance to force a "dud" roll (1 or 2)
      if (crypto.randomInt(0, 100) < 50) {
        return crypto.randomInt(1, 3); // 1 or 2
      }
    }

    // Normal Random Roll
    return crypto.randomInt(1, 7);
  }

  rollDice(playerId) {
    if (this.state !== 'waiting_for_roll' || this.activePlayer.id !== playerId) return false;

    if (this.consecutiveSixes === 2) {
      // Force 1-5 on the 3rd roll to avoid skipping turn
      this.diceRoll = crypto.randomInt(1, 6); // 1 inclusive, 6 exclusive (1-5)
    } else {
      this.diceRoll = this.determineFlowStateRoll();
    }

    this.lastAction = `${this.activePlayer.name} rolled a ${this.diceRoll}`;

    // Adjust Flow State Meters based on the roll
    if (this.diceRoll === 6) {
      this.consecutiveSixes++;
      this.activePlayer.overpowerMeter += 15; // Getting a 6 makes you slightly overpowered
      this.activePlayer.frustrationMeter = Math.max(0, this.activePlayer.frustrationMeter - 20); // Relieves frustration
    } else {
      this.consecutiveSixes = 0;
      // If they are stuck in base and roll a dud, increase frustration
      const tokensInBase = this.activePlayer.tokens.filter(t => t.status === 'base').length;
      if (tokensInBase === 4) {
        this.activePlayer.frustrationMeter += 15;
      } else if (this.diceRoll <= 2) {
        this.activePlayer.frustrationMeter += 5; // Dud roll
      }
    }

    // Determine valid moves
    const validMoves = this.players[this.turnIndex].tokens.filter(t => this.isValidMove(t));

    if (validMoves.length === 0) {
      this.lastAction = `${this.activePlayer.name} rolled a ${this.diceRoll}. No valid moves.`;
      this.state = 'animating_roll'; // Wait for animation before passing turn
    } else {
      this.lastAction = `${this.activePlayer.name} rolled a ${this.diceRoll}.`;
      this.state = 'waiting_for_move';
      this.turnDeadline = Date.now() + 45000; // Reset timer for move
    }
    return true;
  }

  completeRollAnimation() {
    if (this.state === 'animating_roll') {
      this.nextTurn();
    }
  }

  isValidMove(token) {
    if (token.status === 'home') return false;
    
    if (token.status === 'base') {
      return this.diceRoll === 6;
    }

    const startPos = this.activePlayer.colorIndex * 13 + 8;
    
    if (token.status === 'main') {
      // Distance traveled so far
      let traveled = token.position >= startPos ? (token.position - startPos) : (this.mainTrackLength - startPos + token.position);
      if (traveled + this.diceRoll > this.travelToHomeStretch) {
        const homeStretchPos = traveled + this.diceRoll - (this.travelToHomeStretch + 1); // 0 to 5
        if (homeStretchPos > 5) return false; // Overshoot home
        return true;
      }
      return true; // Still on main track
    }

    if (token.status === 'homestretch') {
      const currentHomePos = token.position - 100;
      if (currentHomePos + this.diceRoll > 5) return false; // Overshoot
      return true;
    }

    return false;
  }

  moveToken(playerId, tokenId) {
    if (this.state !== 'waiting_for_move' || this.activePlayer.id !== playerId) return false;

    const token = this.activePlayer.tokens.find(t => t.id === tokenId);
    if (!token || !this.isValidMove(token)) return false;

    let getAnotherTurn = this.diceRoll === 6;
    const startPos = this.activePlayer.colorIndex * 13 + 8;

    if (token.status === 'base') {
      token.status = 'main';
      token.position = startPos;
      this.lastAction = `${this.activePlayer.name} unlocked a token!`;
      this.animationDuration = 500; // Quick unlock animation
    } else if (token.status === 'main') {
      let traveled = token.position >= startPos ? (token.position - startPos) : (this.mainTrackLength - startPos + token.position);
      
      if (traveled + this.diceRoll > this.travelToHomeStretch) {
        // Entering home stretch
        const homeStretchPos = traveled + this.diceRoll - (this.travelToHomeStretch + 1);
        if (homeStretchPos === 5) {
          token.status = 'home';
          token.position = 999;
          this.lastAction = `${this.activePlayer.name} brought a token HOME!`;
          getAnotherTurn = true;
          this.animationDuration = 2000;
        } else {
          token.status = 'homestretch';
          token.position = 100 + homeStretchPos;
          this.lastAction = `${this.activePlayer.name} entered the home stretch.`;
          this.animationDuration = (this.diceRoll + 1) * 200 + 400;
        }
      } else {
        // Moving on main track
        token.position = (token.position + this.diceRoll) % this.mainTrackLength;
        this.lastAction = `${this.activePlayer.name} moved a token.`;

        // Check for captures
        const captureResult = this.checkCapture(token.position, this.activePlayer.colorIndex);
        if (captureResult.capturedDistance > 0) {
          getAnotherTurn = true;
          this.lastAction = `${this.activePlayer.name} captured an opponent's token!`;
          this.trollEvent = `${this.activePlayer.name} brutally captured ${captureResult.victimName}'s token and sent it all the way back to base!`;
          
          // Flow State Adjustments for Capture
          this.activePlayer.overpowerMeter += 40; // Attacker becomes very overpowered
          this.activePlayer.frustrationMeter = 0; // Attacker is very happy
          
          const victim = this.players.find(p => p.name === captureResult.victimName);
          if (victim) {
            victim.frustrationMeter += 50; // Victim becomes highly frustrated
            victim.overpowerMeter = 0; // Victim is no longer overpowered
          }

          // Sequence: Attacker hops (diceRoll * 200ms) + Victim slides back (capturedDistance * 100ms) + buffers
          this.animationDuration = (this.diceRoll * 200) + (captureResult.capturedDistance * 100) + 600; 
        } else {
          // Check if landed on safe zone
          const safeZones = [];
          for (let i = 0; i < this.N; i++) {
            safeZones.push(i * 13 + 8);
            safeZones.push((i * 13 + 16) % this.mainTrackLength);
          }
          if (safeZones.includes(token.position)) {
            this.lastAction = `${this.activePlayer.name} landed on a safe zone!`;
          }
          this.animationDuration = (this.diceRoll + 1) * 200 + 400; // 200ms per step + buffer
        }
      }
    } else if (token.status === 'homestretch') {
      const currentHomePos = token.position - 100;
      if (currentHomePos + this.diceRoll === 5) {
        token.status = 'home';
        token.position = 999;
        this.lastAction = `${this.activePlayer.name} brought a token HOME!`;
        getAnotherTurn = true;
      } else {
        token.position += this.diceRoll;
      }
    }

    this.state = 'animating';
    this.pendingNextTurn = !getAnotherTurn;

    // Check win condition
    const hasWon = this.activePlayer.tokens.every(t => t.status === 'home');
    if (hasWon && !this.activePlayer.rank) {
      this.activePlayer.rank = this.currentRank++;
      this.lastWinner = this.activePlayer;
      
      const activePlayers = this.players.filter(p => !p.isKicked && !p.rank);
      if (activePlayers.length === 0) {
        this.pendingCelebration = true;
        this.pendingNextTurn = true; // nextTurn will handle game over
        this.lastAction = 'Everyone has finished!';
      } else if (activePlayers.length === 1) {
        // Only one player left, they are the loser!
        activePlayers[0].rank = this.currentRank;
        this.pendingCelebration = true;
        this.pendingNextTurn = true; // nextTurn will handle game over transition
        this.lastAction = `${this.activePlayer.name} finished ${this.getRankName(this.activePlayer.rank)}! ${activePlayers[0].name} is the LOSER!`;
        this.trollEvent = `${activePlayers[0].name} is officially the biggest loser of this game! Roast them mercilessly for losing to ${this.activePlayer.name}.`;
      } else {
        // Still players left, trigger celebration
        this.pendingCelebration = true;
        this.lastAction = `${this.activePlayer.name} finished ${this.getRankName(this.activePlayer.rank)}!`;
        this.pendingNextTurn = true; // After celebration, pass turn since they are done
      }
    }

    return true;
  }

  getRankName(rank) {
    if (rank === 1) return '1st Place';
    if (rank === 2) return '2nd Place';
    if (rank === 3) return '3rd Place';
    return `${rank}th Place`;
  }

  completeAnimation() {
    if (this.state === 'animating') {
      if (this.pendingCelebration) {
        this.state = 'celebrating';
        this.pendingCelebration = false;
        // The server will hold this state for 6 seconds then call completeCelebration()
      } else if (this.pendingNextTurn) {
        this.nextTurn();
      } else {
        this.state = 'waiting_for_roll';
        this.turnDeadline = Date.now() + 45000; // Reset timer for the extra roll
      }
    }
  }

  completeCelebration() {
    if (this.state === 'celebrating') {
      this.nextTurn();
    }
  }

  checkCapture(pos, myColorIndex) {
    // Cannot capture on safe zones
    if (this.isSafeZone(pos)) {
      return { capturedDistance: 0, victimName: null }; // Return 0 distance = no capture
    }

    let capturedDistance = 0;
    let victimName = null;
    for (let player of this.players) {
      if (player.colorIndex !== myColorIndex) {
        for (let token of player.tokens) {
          if (token.status === 'main' && token.position === pos) {
            token.status = 'base';
            token.position = -1;
            victimName = player.name;
            
            // Calculate reverse distance back to base for timing
            const victimStartPos = player.colorIndex * 13 + 8;
            let currentPos = pos;
            capturedDistance = currentPos >= victimStartPos ? (currentPos - victimStartPos) : (currentPos + 52 - victimStartPos);
          }
        }
      }
    }
    return { capturedDistance, victimName };
  }

  nextTurn() {
    // Natural Decay: Players cool off when it's not their turn
    if (this.activePlayer) {
      this.activePlayer.frustrationMeter = Math.max(0, (this.activePlayer.frustrationMeter || 0) - 5);
      this.activePlayer.overpowerMeter = Math.max(0, (this.activePlayer.overpowerMeter || 0) - 5);
    }

    // Before moving turn, check if the game should already be over due to kicks/wins
    const activePlayers = this.players.filter(p => !p.isKicked && !p.rank);
    if (activePlayers.length <= 1) {
       if (activePlayers.length === 1) {
          activePlayers[0].rank = this.currentRank;
       }
       this.state = 'finished';
       this.lastAction = 'Game Over!';
       return;
    }

    let originalIndex = this.turnIndex;
    do {
      this.turnIndex = (this.turnIndex + 1) % this.players.length;
    } while ((this.activePlayer.isKicked || this.activePlayer.rank !== null) && this.turnIndex !== originalIndex);

    // Removed: this.diceRoll = null; (Preserve last roll value for the UI)
    this.consecutiveSixes = 0;
    this.state = 'waiting_for_roll';
    this.turnDeadline = Date.now() + 45000; // 45 seconds timer
  }

  kickPlayer(playerId) {
    const p = this.players.find(p => p.id === playerId || p.persistentId === playerId);
    if (p && !p.isKicked) {
      p.isKicked = true;
      this.lastAction = `${p.name} was kicked from the game!`;
      
      const activePlayers = this.players.filter(pl => !pl.isKicked && !pl.rank);
      if (activePlayers.length <= 1) {
         if (activePlayers.length === 1) activePlayers[0].rank = this.currentRank;
         this.state = 'finished';
         this.lastAction = 'Game Over! Not enough active players.';
         return true;
      }

      if (this.activePlayer.id === p.id) {
        this.nextTurn();
      }
      return true;
    }
    return false;
  }

  autoSkipTurn() {
    if (this.state === 'waiting_for_roll' || this.state === 'waiting_for_move') {
      this.lastAction = `${this.activePlayer.name} took too long and lost their turn!`;
      this.nextTurn();
      return true;
    }
    return false;
  }

  getState() {
    let validMoves = [];
    if (this.state === 'waiting_for_move') {
      validMoves = this.activePlayer.tokens.filter(t => this.isValidMove(t)).map(t => t.id);
    }
    return {
      players: this.players,
      turnIndex: this.turnIndex,
      diceRoll: this.diceRoll,
      state: this.state,
      lastAction: this.lastAction,
      lastWinner: this.lastWinner,
      validMoves: validMoves,
      turnDeadline: this.turnDeadline
    };
  }
}

module.exports = LudoEngine;
