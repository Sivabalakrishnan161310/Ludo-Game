class LudoEngine {
  constructor(players) {
    this.N = Math.max(4, players.length); // 4, 5, or 6 arms
    this.mainTrackLength = this.N * 13;
    this.travelToHomeStretch = this.mainTrackLength - 3; // Start is index 8. End of arm is 5. Distance = 13*N - 8 + 5 = N*13 - 3.

    // Initialize players with 4 tokens each
    this.players = players.map((p, index) => ({
      id: p.id,
      persistentId: p.persistentId,
      name: p.name,
      colorIndex: index,
      tokens: [
        { id: 0, position: -1, status: 'base' }, // -1 = base, 0 to N*13-1 = main track, 100-104 = home stretch, 999 = home
        { id: 1, position: -1, status: 'base' },
        { id: 2, position: -1, status: 'base' },
        { id: 3, position: -1, status: 'base' }
      ]
    }));
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

    // this.diceRoll = Math.floor(Math.random() * 6) + 1;
    this.diceRoll = Math.floor(Math.random() * 6) + 1;
    this.lastAction = `${this.activePlayer.name} rolled a ${this.diceRoll}`;

    if (this.diceRoll === 6) {
      this.consecutiveSixes++;
      if (this.consecutiveSixes === 3) {
        // 3 sixes = turn skipped
        this.lastAction = `${this.activePlayer.name} rolled three 6s! Turn skipped.`;
        this.nextTurn();
        return true;
      }
    } else {
      this.consecutiveSixes = 0;
    }

    // Check if player has any valid moves
    const hasValidMove = this.players[this.turnIndex].tokens.some(t => this.isValidMove(t));
    
    if (!hasValidMove) {
      this.lastAction += `. No valid moves.`;
      // Auto skip to next turn after a small delay or immediately
      this.nextTurn();
    } else {
      this.state = 'waiting_for_move';
    }
    return true;
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

    if (getAnotherTurn) {
      this.state = 'waiting_for_roll';
      this.diceRoll = null;
    } else {
      this.nextTurn();
    }

    // Check win condition
    const hasWon = this.activePlayer.tokens.every(t => t.status === 'home');
    if (hasWon) {
      this.state = 'finished';
      this.lastAction = `${this.activePlayer.name} HAS WON THE GAME!`;
    }

    return true;
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
    return {
      players: this.players,
      turnIndex: this.turnIndex,
      diceRoll: this.diceRoll,
      state: this.state,
      lastAction: this.lastAction
    };
  }
}

module.exports = LudoEngine;
