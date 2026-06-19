import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { playSteps, playSound } from '../utils/audio';

// Classic 4-Player Ludo Colors matching the NEW image exactly
const colors = ['#ef4444', '#3b82f6', '#facc15', '#22c55e']; // Vibrant Red, Blue, Yellow, Green

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

const BoardClassic = ({ gameState, onTokenClick, localPlayerId }) => {
  const players = gameState.players;
  const cellSize = 40;
  const boardSize = 15 * cellSize; // 600

  // 1D to 2D mapping for 52 main track cells (starting right before Red's start)
  const track = [
    [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0],
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6],
    [2, 6], [1, 6], [0, 6], [0, 7], [0, 8], [1, 8], [2, 8], [3, 8],
    [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
    [7, 14], [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8],
    [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6], [13, 6],
    [12, 6], [11, 6], [10, 6], [9, 6]
  ];

  const homeStretches = [
    [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],     // Red (0)
    [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],     // Blue (1)
    [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]], // Yellow (2)
    [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]  // Green (3)
  ];

  const baseCenters = [
    [[1.5, 1.5], [1.5, 3.5], [3.5, 1.5], [3.5, 3.5]],         // Red Base
    [[1.5, 10.5], [1.5, 12.5], [3.5, 10.5], [3.5, 12.5]],     // Blue Base
    [[10.5, 10.5], [10.5, 12.5], [12.5, 10.5], [12.5, 12.5]], // Yellow Base
    [[10.5, 1.5], [10.5, 3.5], [12.5, 1.5], [12.5, 3.5]]      // Green Base
  ];

  const getTokenPosition = (colorIndex, token) => {
    let r, c;
    if (token.status === 'base' || token.position === -1) {
      const bc = baseCenters[colorIndex][token.id % 4];
      r = bc[0]; c = bc[1];
    } else if (token.status === 'main') {
      const pos = track[token.position];
      r = pos[0]; c = pos[1];
    } else if (token.status === 'homestretch') {
      const pos = homeStretches[colorIndex][token.position - 100];
      r = pos[0]; c = pos[1];
    } else {
      // Home (Center of board)
      return { x: 7.5 * cellSize, y: 7.5 * cellSize };
    }
    return {
      x: c * cellSize + cellSize / 2,
      y: r * cellSize + cellSize / 2
    };
  };

  const calculatePath = (colorIndex, prevToken, token) => {
    const path = [];
    if (prevToken.status === 'base' && token.status === 'main') {
      path.push(getTokenPosition(colorIndex, token));
      return path;
    }
    if (prevToken.status === 'main' && token.status === 'main') {
      let currentPos = prevToken.position;
      const targetPos = token.position;
      let distance = targetPos >= currentPos ? (targetPos - currentPos) : (52 - currentPos + targetPos);
      for (let i = 1; i <= distance; i++) {
        let stepPos = (currentPos + i) % 52;
        path.push(getTokenPosition(colorIndex, { status: 'main', position: stepPos }));
      }
      return path;
    }
    if (prevToken.status === 'main' && token.status === 'homestretch') {
      const startPos = colorIndex * 13 + 8;
      const entrancePos = (startPos + 50) % 52; 
      let currentPos = prevToken.position;
      let distanceToEntrance = entrancePos >= currentPos ? (entrancePos - currentPos) : (52 - currentPos + entrancePos);
      for (let i = 1; i <= distanceToEntrance; i++) {
        let stepPos = (currentPos + i) % 52;
        path.push(getTokenPosition(colorIndex, { status: 'main', position: stepPos }));
      }
      const targetHomePos = token.position - 100;
      for (let i = 0; i <= targetHomePos; i++) {
        path.push(getTokenPosition(colorIndex, { status: 'homestretch', position: 100 + i }));
      }
      return path;
    }
    if (prevToken.status === 'homestretch' && token.status === 'homestretch') {
      const currentPos = prevToken.position - 100;
      const targetPos = token.position - 100;
      for (let i = currentPos + 1; i <= targetPos; i++) {
        path.push(getTokenPosition(colorIndex, { status: 'homestretch', position: 100 + i }));
      }
      return path;
    }
    if (prevToken.status === 'homestretch' && token.status === 'home') {
      const currentPos = prevToken.position - 100;
      for (let i = currentPos + 1; i <= 4; i++) {
        path.push(getTokenPosition(colorIndex, { status: 'homestretch', position: 100 + i }));
      }
      path.push(getTokenPosition(colorIndex, token));
      return path;
    }
    if (prevToken.status === 'main' && token.status === 'base') {
      const startPos = colorIndex * 13 + 8;
      let currentPos = prevToken.position;
      let distance = currentPos >= startPos ? (currentPos - startPos) : (currentPos + 52 - startPos);
      for (let i = 1; i <= distance; i++) {
        let stepPos = (currentPos - i + 52) % 52;
        path.push(getTokenPosition(colorIndex, { status: 'main', position: stepPos }));
      }
      path.push(getTokenPosition(colorIndex, token));
      return path;
    }
    return [getTokenPosition(colorIndex, token)];
  };

  const prevPlayers = usePrevious(players);
  const lastSoundTriggerRef = useRef(null);

  useEffect(() => {
    if (!prevPlayers) return;
    
    players.forEach(player => {
      const prevPlayer = prevPlayers.find(p => p.id === player.id);
      if (!prevPlayer) return;
      
      player.tokens.forEach(token => {
        const prevToken = prevPlayer.tokens.find(t => t.id === token.id);
        if (!prevToken) return;
        
        if (prevToken.status !== token.status || prevToken.position !== token.position) {
          const soundKey = `${player.id}-${token.id}-${token.position}-${token.status}`;
          if (lastSoundTriggerRef.current === soundKey) return;
          lastSoundTriggerRef.current = soundKey;

          const pColorIndex = player.colorIndex % 4;
          const path = calculatePath(pColorIndex, prevToken, token);
          if (path && path.length > 0) {
            const isVictim = prevToken.status === 'main' && token.status === 'base';
            const isUnlock = prevToken.status === 'base' && token.status === 'main';
            const isHome = prevToken.status !== 'home' && token.status === 'home';
            
            const greyStarIndices = [3, 16, 29, 42];
            const startIndices = [8, 21, 34, 47];
            const isSafeZoneLanding = token.status === 'main' && (greyStarIndices.includes(token.position) || startIndices.includes(token.position));
            const didCapture = gameState && gameState.lastAction && gameState.lastAction.includes('captured') && gameState.players[gameState.turnIndex].id === player.id;

            let finalSound = null;
            if (isHome) finalSound = 'token_home';
            else if (didCapture) finalSound = 'token_kill';
            else if (isSafeZoneLanding) finalSound = 'safe_zone';

            if (isUnlock) {
               playSound('token_unlock');
            } else if (!isVictim) {
               playSteps(path.length, 250, finalSound);
            }
          }
        }
      });
    });
  }, [players, prevPlayers, gameState]);

  const renderCells = () => {
    const cells = [];
    for (let i = 0; i < 52; i++) {
      const [r, c] = track[i];
      let fill = 'white';
      let content = null;
      
      // Stars and Safe Zones logic matching Ludo King
      const startIndices = {
        8: colors[0],   // Red start
        21: colors[1],  // Blue start
        34: colors[2],  // Yellow start
        47: colors[3]   // Green start
      };
      
      const greyStarIndices = [3, 16, 29, 42];

      if (startIndices[i]) {
        fill = startIndices[i];
        // Draw star inside the colored start square
        content = <polygon points={`${c*cellSize+20},${r*cellSize+5} ${c*cellSize+25},${r*cellSize+15} ${c*cellSize+35},${r*cellSize+15} ${c*cellSize+27},${r*cellSize+23} ${c*cellSize+30},${r*cellSize+35} ${c*cellSize+20},${r*cellSize+28} ${c*cellSize+10},${r*cellSize+35} ${c*cellSize+13},${r*cellSize+23} ${c*cellSize+5},${r*cellSize+15} ${c*cellSize+15},${r*cellSize+15}`} fill="rgba(255,255,255,0.8)" />;
      } else if (greyStarIndices.includes(i)) {
        fill = '#e2e8f0'; // Light gray for safe spots
        content = <polygon points={`${c*cellSize+20},${r*cellSize+5} ${c*cellSize+25},${r*cellSize+15} ${c*cellSize+35},${r*cellSize+15} ${c*cellSize+27},${r*cellSize+23} ${c*cellSize+30},${r*cellSize+35} ${c*cellSize+20},${r*cellSize+28} ${c*cellSize+10},${r*cellSize+35} ${c*cellSize+13},${r*cellSize+23} ${c*cellSize+5},${r*cellSize+15} ${c*cellSize+15},${r*cellSize+15}`} fill="#94a3b8" />;
      }

      cells.push(
        <g key={`track-${i}`}>
          <rect x={c * cellSize} y={r * cellSize} width={cellSize} height={cellSize} fill={fill} stroke="#1e293b" strokeWidth="2" />
          {content}
        </g>
      );
    }
    return cells;
  };

  const renderHomeStretches = () => {
    const stretches = [];
    homeStretches.forEach((stretch, colorIndex) => {
      stretch.forEach(([r, c]) => {
        stretches.push(
          <rect key={`home-${colorIndex}-${r}-${c}`} x={c * cellSize} y={r * cellSize} width={cellSize} height={cellSize} fill={colors[colorIndex]} stroke="#1e293b" strokeWidth="2" />
        );
      });
    });
    return stretches;
  };

  const renderBases = () => {
    const bases = [
      { r: 0, c: 0, color: colors[0] }, // Red
      { r: 0, c: 9, color: colors[1] }, // Blue
      { r: 9, c: 9, color: colors[2] }, // Yellow
      { r: 9, c: 0, color: colors[3] }  // Green
    ];

    return bases.map((b, i) => (
      <g key={`base-${i}`}>
        {/* Outer colored rect */}
        <rect x={b.c * cellSize} y={b.r * cellSize} width={cellSize * 6} height={cellSize * 6} fill={b.color} stroke="black" strokeWidth="2" />
        {/* Inner white rect */}
        <rect x={b.c * cellSize + cellSize} y={b.r * cellSize + cellSize} width={cellSize * 4} height={cellSize * 4} fill="white" />
        {/* 4 Circles (Sized exactly to match the tokens) */}
        <circle cx={b.c * cellSize + cellSize * 2} cy={b.r * cellSize + cellSize * 2} r={16} fill="#e2e8f0" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
        <circle cx={b.c * cellSize + cellSize * 4} cy={b.r * cellSize + cellSize * 2} r={16} fill="#e2e8f0" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
        <circle cx={b.c * cellSize + cellSize * 2} cy={b.r * cellSize + cellSize * 4} r={16} fill="#e2e8f0" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
        <circle cx={b.c * cellSize + cellSize * 4} cy={b.r * cellSize + cellSize * 4} r={16} fill="#e2e8f0" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
      </g>
    ));
  };

  const renderCenterTriangles = () => {
    return (
      <g>
        <polygon points={`${6*cellSize},${6*cellSize} ${6*cellSize},${9*cellSize} ${7.5*cellSize},${7.5*cellSize}`} fill={colors[0]} stroke="black" />
        <polygon points={`${6*cellSize},${6*cellSize} ${9*cellSize},${6*cellSize} ${7.5*cellSize},${7.5*cellSize}`} fill={colors[1]} stroke="black" />
        <polygon points={`${9*cellSize},${6*cellSize} ${9*cellSize},${9*cellSize} ${7.5*cellSize},${7.5*cellSize}`} fill={colors[2]} stroke="black" />
        <polygon points={`${6*cellSize},${9*cellSize} ${9*cellSize},${9*cellSize} ${7.5*cellSize},${7.5*cellSize}`} fill={colors[3]} stroke="black" />
      </g>
    );
  };

  // Setup view rotation
  const localPlayer = players.find(p => p.id === localPlayerId);
  const localColorIndex = localPlayer ? (localPlayer.colorIndex % 4) : 0;
  const boardRotation = -90 - (localColorIndex * 90);

  const isValidMove = (player, token) => {
    if (!gameState || gameState.state !== 'waiting_for_move') return false;
    const activePlayer = gameState.players[gameState.turnIndex];
    if (activePlayer.id !== player.id) return false;
    
    if (gameState.validMoves) {
      return gameState.validMoves.includes(token.id);
    }
    
    const diceRoll = gameState.diceRoll;
    if (token.status === 'base' && diceRoll !== 6) return false;
    
    if (token.status === 'homestretch') {
      const currentHomePos = token.position - 100;
      if (currentHomePos + diceRoll > 5) return false;
    }
    return true;
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', overflow: 'hidden', padding: '1rem' }}>
      <svg 
        style={{ 
          width: '100%', height: '100%',
          transform: `rotate(${boardRotation}deg)`, 
          transition: 'transform 1s ease-in-out',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }} 
        viewBox={`0 0 ${boardSize} ${boardSize}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="classicCoinShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="4" stdDeviation="2" floodOpacity="0.8" />
          </filter>
        </defs>

        {renderBases()}
        {renderCells()}
        {renderHomeStretches()}
        {renderCenterTriangles()}

        {/* Outline for the whole board */}
        <rect x="0" y="0" width={boardSize} height={boardSize} fill="none" stroke="black" strokeWidth="4" />

        {/* Render Tokens */}
        {(() => {
          // 1. Flatten all tokens and calculate raw positions
          const allTokens = [];
          players.forEach(player => {
            const pColorIndex = player.colorIndex % 4;
            player.tokens.forEach(token => {
              const { x, y } = getTokenPosition(pColorIndex, token);
              const isHighlight = isValidMove(player, token);
              allTokens.push({ player, token, pColorIndex, x, y, isHighlight });
            });
          });

          // 2. Group by rounded x, y (except base tokens)
          const groups = {};
          allTokens.forEach(t => {
            if (t.token.status === 'base') return;
            const key = `${Math.round(t.x)}-${Math.round(t.y)}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
          });

          // 3. Assign offsets
          allTokens.forEach(t => {
            t.ox = 0; t.oy = 0;
            if (t.token.status === 'base') return;
            const key = `${Math.round(t.x)}-${Math.round(t.y)}`;
            const group = groups[key];
            if (group.length > 1) {
              const idx = group.indexOf(t);
              const offsets = {
                2: [{x:-8,y:-8}, {x:8,y:8}],
                3: [{x:-8,y:-8}, {x:8,y:-8}, {x:0,y:8}],
                4: [{x:-8,y:-8}, {x:8,y:-8}, {x:-8,y:8}, {x:8,y:8}]
              };
              if (group.length <= 4) {
                 t.ox = offsets[group.length][idx].x;
                 t.oy = offsets[group.length][idx].y;
              } else {
                 const angle = (idx / group.length) * Math.PI * 2;
                 t.ox = Math.cos(angle) * 10;
                 t.oy = Math.sin(angle) * 10;
              }
            }
          });

          // 4. Sort so highlighted tokens are rendered last (on top)
          allTokens.sort((a, b) => (a.isHighlight === b.isHighlight ? 0 : a.isHighlight ? 1 : -1));

          return allTokens.map(({ player, token, pColorIndex, x, y, ox, oy, isHighlight }) => {
            const finalX = x + ox;
            const finalY = y + oy;
            
            // Calculate anim data inline
            let animData = null;
            if (prevPlayers) {
               const prevPlayer = prevPlayers.find(p => p.id === player.id);
               if (prevPlayer) {
                  const prevToken = prevPlayer.tokens.find(t => t.id === token.id);
                  if (prevToken && (prevToken.status !== token.status || prevToken.position !== token.position)) {
                     const path = calculatePath(pColorIndex, prevToken, token);
                     if (path && path.length > 0) {
                        const originPos = getTokenPosition(pColorIndex, prevToken);
                        animData = {
                           path,
                           originX: originPos.x,
                           originY: originPos.y,
                           isCapture: prevToken.status === 'main' && token.status === 'base'
                        };
                     }
                  }
               }
            }
            let animateProps = { x: finalX, y: finalY };
            let transitionProps = { type: "spring", stiffness: 300, damping: 25 };

            if (animData && animData.path && animData.path.length > 0) {
              const pathCoords = animData.path;
              const isCapture = animData.isCapture;
              const N = pathCoords.length;

              if (isCapture) {
                // Smooth rapid slide back to base for captured tokens
                animateProps = {
                  x: [null, ...pathCoords.map(p => p.x), finalX],
                  y: [null, ...pathCoords.map(p => p.y), finalY]
                };
                const keyframesCount = N + 2;
                const times = Array.from({ length: keyframesCount }).map((_, i) => i / (keyframesCount - 1));
                const totalDuration = (N + 1) * 0.05;
                transitionProps = {
                  x: { duration: totalDuration, times, ease: "linear" },
                  y: { duration: totalDuration, times, ease: "linear" }
                };
              } else {
                // Box-by-box Hopping Animation!
                const hopX = [animData.originX]; 
                const hopY = [animData.originY];
                const hopScale = [1];
                const times = [0];
                
                let currentPx = animData.originX;
                let currentPy = animData.originY;
                
                pathCoords.forEach((p, idx) => {
                  const stepNumber = idx + 1;
                  
                  // 1. Prepare to jump
                  hopX.push(currentPx);
                  hopY.push(currentPy);
                  hopScale.push(1);
                  times.push((stepNumber - 0.8) / (N + 1));
                  
                  // 2. Midpoint (Peak of jump)
                  hopX.push((currentPx + p.x) / 2);
                  hopY.push((currentPy + p.y) / 2); // Can't safely subtract Y because board rotates
                  hopScale.push(1.6); // Massive scale up for the hop illusion!
                  times.push((stepNumber - 0.5) / (N + 1));
                  
                  // 3. Land exactly on the box
                  hopX.push(p.x);
                  hopY.push(p.y);
                  hopScale.push(1);
                  times.push((stepNumber - 0.1) / (N + 1)); // Arrive fast
                  
                  // 4. Rest on the box for a moment before next jump
                  hopX.push(p.x);
                  hopY.push(p.y);
                  hopScale.push(1);
                  times.push(stepNumber / (N + 1));
                  
                  currentPx = p.x;
                  currentPy = p.y;
                });
                
                // Final slide to offset position (if stacking with other tokens)
                hopX.push(finalX);
                hopY.push(finalY);
                hopScale.push(1);
                times.push(1);
                
                animateProps = { x: hopX, y: hopY, scale: hopScale };
                const totalDuration = (N + 1) * 0.35; // 350ms per jump to see it clearly!
                transitionProps = {
                  x: { duration: totalDuration, times, ease: "easeInOut" },
                  y: { duration: totalDuration, times, ease: "easeInOut" },
                  scale: { duration: totalDuration, times, ease: "easeInOut" }
                };
              }
            }

            if (isHighlight) {
               animateProps.scale = [1, 1.25, 1];
               transitionProps.scale = { repeat: Infinity, duration: 1, ease: "easeInOut" };
            } else if (!animateProps.scale) {
               animateProps.scale = 1;
            }
            
            return (
              <motion.g
                key={`token-${player.id}-${token.id}`}
                initial={false}
                animate={animateProps}
                transition={transitionProps}
                style={{ cursor: isHighlight ? 'pointer' : 'default' }}
                onClick={() => onTokenClick && onTokenClick(token.id)}
              >
                {/* 3D Coin look */}
                <circle cx={0} cy={0} r={14} fill={colors[pColorIndex]} filter="url(#classicCoinShadow)" stroke="white" strokeWidth="2" />
                <circle cx={0} cy={0} r={8} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
                
                {/* Extra glowing ring if highlighted */}
                {isHighlight && (
                  <circle cx={0} cy={0} r={18} fill="none" stroke="white" strokeWidth="2" strokeDasharray="4 4" opacity="0.8" />
                )}
              </motion.g>
            );
          });
        })()}
      </svg>
    </div>
  );
};

export default BoardClassic;
