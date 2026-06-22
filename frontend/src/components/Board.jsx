import React from 'react';
import { motion } from 'framer-motion';

const colors = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Yellow
  '#a855f7', // Purple
  '#06b6d4'  // Cyan
];

const Board = ({ players = [], onTokenClick, localPlayerId }) => {
  const N = Math.max(4, players.length);
  const angleStep = 360 / N;

  const localPlayer = players.find(p => p.id === localPlayerId);
  const localColorIndex = localPlayer ? localPlayer.colorIndex : 0;
  
  // Rotate the entire board so the local player's arm always points DOWN (facing the user)
  const boardRotation = 180 - (localColorIndex * angleStep);
  
  const centerX = 400;
  const centerY = 400;
  const cellSize = 25;
  
  // Distance from center to the inner edge of the arm to prevent overlap
  const innerDistance = (cellSize * 1.5) / Math.tan(Math.PI / N);
  const armTranslateY = -(cellSize * 6 + innerDistance);

  // Render a single arm
  const renderArm = (angle, colorIndex) => {
    const color = colors[colorIndex % colors.length];
    
    return (
      <g key={`arm-${colorIndex}`} transform={`rotate(${angle} ${centerX} ${centerY}) translate(${centerX} ${centerY})`}>
        {/* Draw the 3x6 grid for the arm path */}
        <g transform={`translate(-${cellSize * 1.5}, ${armTranslateY})`}>
          {Array.from({ length: 6 }).map((_, row) => (
            Array.from({ length: 3 }).map((_, col) => {
              let fill = 'rgba(255, 255, 255, 0.05)';
              if (col === 1 && row > 0) fill = color; // Home stretch
              if (col === 2 && row === 1) fill = color; // Start square
              
              return (
                <rect 
                  key={`${row}-${col}`}
                  x={col * cellSize}
                  y={row * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill={fill}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="1"
                />
              );
            })
          ))}
        </g>
        
        {/* Draw the Home Base */}
        <g transform={`translate(${cellSize * 2}, ${armTranslateY - cellSize * 1.5})`}>
          <rect x="0" y="0" width={cellSize * 4.5} height={cellSize * 4.5} rx="15" fill="rgba(0,0,0,0.6)" stroke={color} strokeWidth="4" />
          <circle cx={cellSize * 1.25} cy={cellSize * 1.25} r={cellSize * 0.5} fill={color} opacity="0.3" />
          <circle cx={cellSize * 3.25} cy={cellSize * 1.25} r={cellSize * 0.5} fill={color} opacity="0.3" />
          <circle cx={cellSize * 1.25} cy={cellSize * 3.25} r={cellSize * 0.5} fill={color} opacity="0.3" />
          <circle cx={cellSize * 3.25} cy={cellSize * 3.25} r={cellSize * 0.5} fill={color} opacity="0.3" />
        </g>
      </g>
    );
  };

  const getMainTrackCoords = (pos) => {
    const arm = Math.floor(pos / 13);
    const c = pos % 13;
    let row, col;
    if (c <= 5) { col = 0; row = 5 - c; }
    else if (c === 6) { col = 1; row = 0; }
    else { col = 2; row = c - 7; }
    return { arm, row, col };
  };

  const getCellCenter = (arm, row, col) => {
    const tx = -cellSize * 1.5;
    const ty = armTranslateY;
    const cx = tx + col * cellSize + cellSize / 2;
    const cy = ty + row * cellSize + cellSize / 2;
    const rad = (arm * angleStep * Math.PI) / 180;
    return {
      x: centerX + cx * Math.cos(rad) - cy * Math.sin(rad),
      y: centerY + cx * Math.sin(rad) + cy * Math.cos(rad)
    };
  };

  const getBaseCenter = (arm, tokenIdx) => {
    const bx = cellSize * 2;
    const by = armTranslateY - cellSize * 1.5;
    let cx = bx + (tokenIdx % 2 === 0 ? cellSize * 1.25 : cellSize * 3.25);
    let cy = by + (tokenIdx < 2 ? cellSize * 1.25 : cellSize * 3.25);
    const rad = (arm * angleStep * Math.PI) / 180;
    return {
      x: centerX + cx * Math.cos(rad) - cy * Math.sin(rad),
      y: centerY + cx * Math.sin(rad) + cy * Math.cos(rad)
    };
  };

  const getTokenPosition = (playerColorIndex, token) => {
    if (token.status === 'base' || token.position === -1) {
      return getBaseCenter(playerColorIndex, token.id);
    }
    if (token.status === 'main') {
      const { arm, row, col } = getMainTrackCoords(token.position);
      return getCellCenter(arm, row, col);
    }
    if (token.status === 'homestretch') {
      const h = token.position - 100; // 0 to 4
      return getCellCenter(playerColorIndex, h + 1, 1);
    }
    if (token.status === 'home') {
      return { x: centerX, y: centerY };
    }
    return { x: 0, y: 0 };
  };

  // Center Polygon vertices
  const R = Math.sqrt(Math.pow(cellSize * 1.5, 2) + Math.pow(innerDistance, 2));
  const centerPoints = Array.from({ length: N }).map((_, i) => {
    // The bottom corners of the arms form the polygon
    const angle1 = (i * angleStep) * Math.PI / 180;
    const cx = -cellSize * 1.5;
    const cy = -innerDistance;
    const x = centerX + cx * Math.cos(angle1) - cy * Math.sin(angle1);
    const y = centerY + cx * Math.sin(angle1) + cy * Math.cos(angle1);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', width: '100%', height: '100%', overflow: 'hidden', padding: '1rem' }}>
      <svg 
        style={{ 
          width: '100%', height: '100%', 
          transform: `rotate(${boardRotation}deg)`, 
          transition: 'transform 1s ease-in-out' 
        }} 
        viewBox="0 0 800 800"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="coinShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.6" />
          </filter>
          <filter id="boardGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="15" floodColor="#ffffff" floodOpacity="0.1" />
          </filter>
          {colors.map((color, i) => (
            <radialGradient key={`grad-${i}`} id={`grad-${i}`} cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="40%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
            </radialGradient>
          ))}
        </defs>

        <g filter="url(#boardGlow)">
          {/* Render N Arms */}
          {Array.from({ length: N }).map((_, i) => renderArm(i * angleStep, i))}
          
          {/* Center Polygon */}
          <polygon 
            points={centerPoints} 
            fill="rgba(20, 30, 50, 0.9)" 
            stroke="rgba(255,255,255,0.4)" 
            strokeWidth="3"
          />
        </g>

        {/* Render Tokens */}
        {players.map(player => (
          player.tokens.map(token => {
            const { x, y } = getTokenPosition(player.colorIndex, token);
            return (
              <motion.g
                key={`token-${player.id}-${token.id}`}
                initial={false}
                animate={{ x, y }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                style={{ cursor: 'pointer' }}
                onClick={() => onTokenClick && onTokenClick(token.id)}
              >
                {/* Ground shadow (adjusted for pin) */}
                <ellipse cx={0} cy={10} rx={8} ry={3} fill="rgba(0,0,0,0.4)" filter="url(#coinShadow)" />
                {/* === GLASS MAP PIN SHAPE === */}
                <path
                  d="M 0,8 C -3,3 -12,-4 -12,-12 C -12,-18.6 -6.6,-24 0,-24 C 6.6,-24 12,-18.6 12,-12 C 12,-4 3,3 0,8 Z"
                  fill={`url(#grad-${player.colorIndex % colors.length})`}
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="1.5"
                />
                {/* Inner Hole */}
                <circle cx={0} cy={-12} r={4.5} fill="#FFFFFF" opacity="0.9" />
                {/* Glassy highlight on top-left edge */}
                <path
                  d="M -8,-17 A 10,10 0 0,1 6,-22"
                  fill="none"
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </motion.g>
            );
          })
        ))}
      </svg>
    </div>
  );
};

export default Board;
