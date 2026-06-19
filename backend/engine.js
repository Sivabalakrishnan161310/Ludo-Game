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
        ]
      };
    });
    this.turnIndex = 0;
    this.diceRoll = null;
    this.consecutiveSixes = 0;
    this.state = 'waiting_for_roll'; // waiting_for_roll, waiting_for_move, finished
    this.lastAction = 'Game Started! Roll the dice.';
  }

  get activePlayer() {
    return this.players[this.turnIndex];
  }

  rollDice(playerId) {
    if (this.state !== 'waiting_for_roll' || this.activePlayer.id !== playerId) return false;

    if (this.consecutiveSixes === 2) {
      // Force 1-5 on the 3rd roll to avoid skipping turn
      this.diceRoll = crypto.randomInt(1, 6); // 1 inclusive, 6 exclusive (1-5)
    } else {
      this.diceRoll = crypto.randomInt(1, 7); // 1 inclusive, 7 exclusive (1-6)
    }

    this.lastAction = `${this.activePlayer.name} rolled a ${this.diceRoll}`;

    if (this.diceRoll === 6) {
      this.consecutiveSixes++;
    } else {
      this.consecutiveSixes = 0;
    }

    // Determine valid moves
    const validMoves = this.players[this.turnIndex].tokens.filter(t => this.isValidMove(t));

    if (validMoves.length === 0) {
      this.lastAction = `${this.activePlayer.name} rolled a ${this.diceRoll}. No valid moves.`;
      this.state = 'animating_roll'; // Wait for animation before passing turn
    } else {
      this.lastAction = `${this.activePlayer.name} rolled a ${this.diceRoll}.`;
      this.state = 'waiting_for_move';
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
        } else {
          token.status = 'homestretch';
          token.position = 100 + homeStretchPos;
          this.lastAction = `${this.activePlayer.name} entered the home stretch.`;
        }
      } else {
        // Moving on main track
        token.position = (token.position + this.diceRoll) % this.mainTrackLength;
        this.lastAction = `${this.activePlayer.name} moved a token.`;

        // Check for captures
        const captured = this.checkCapture(token.position, this.activePlayer.colorIndex);
        if (captured) {
          getAnotherTurn = true;
          this.lastAction = `${this.activePlayer.name} captured an opponent's token!`;
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
    if (hasWon) {
      this.state = 'finished';
      this.lastAction = `${this.activePlayer.name} HAS WON THE GAME!`;
    }

    return true;
  }

  completeAnimation() {
    if (this.state === 'animating') {
      if (this.pendingNextTurn) {
        this.nextTurn();
      } else {
        this.state = 'waiting_for_roll';
        this.diceRoll = null;
      }
    }
  }

  checkCapture(pos, myColorIndex) {
    // Safe zones: Start squares and Star squares (8 steps ahead) for all N players
    const safeZones = [];
    for (let i = 0; i < this.N; i++) {
      safeZones.push(i * 13 + 8);
      safeZones.push((i * 13 + 16) % this.mainTrackLength);
    }
    if (safeZones.includes(pos)) return false;

    let captured = false;
    for (let p of this.players) {
      if (p.colorIndex !== myColorIndex) {
        for (let t of p.tokens) {
          if (t.status === 'main' && t.position === pos) {
            t.status = 'base';
            t.position = -1;
            captured = true;
          }
        }
      }
    }
    return captured;
  }

  nextTurn() {
    this.turnIndex = (this.turnIndex + 1) % this.players.length;
    this.diceRoll = null;
    this.consecutiveSixes = 0;
    this.state = 'waiting_for_roll';
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
      validMoves: validMoves
    };
  }
}

module.exports = LudoEngine;
