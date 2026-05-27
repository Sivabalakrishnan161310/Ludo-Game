import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { socket } from './Lobby';
import Board from '../components/Board';
import BoardClassic from '../components/BoardClassic';
import Dice from '../components/Dice';

const classicColors = ['#e63946', '#2a9d8f', '#e9c46a', '#457b9d'];
const starColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#06b6d4'];

const Game = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState(null);
  
  const [rollTrigger, setRollTrigger] = useState(0);
  const [prevAction, setPrevAction] = useState('');

  useEffect(() => {
    // Request current state when loading the game page
    socket.emit('get_room_state', { roomId });

    socket.on('room_update', (data) => {
      setRoomData(data);
    });

    socket.on('room_not_found', () => {
      alert('Room not found! Redirecting to lobby...');
      navigate('/');
    });

    return () => {
      socket.off('room_update');
      socket.off('room_not_found');
    };
  }, [roomId, navigate]);

  useEffect(() => {
    if (roomData && roomData.gameState) {
      const action = roomData.gameState.lastAction;
      if (action !== prevAction && action.includes('rolled a')) {
        setRollTrigger(prev => prev + 1);
        setPrevAction(action);
      }
    }
  }, [roomData, prevAction]);

  const handleTokenClick = (tokenId) => {
    if (roomData && roomData.gameState && roomData.gameState.state === 'waiting_for_move') {
      const activePlayer = roomData.gameState.players[roomData.gameState.turnIndex];
      if (activePlayer.id === socket.id) {
        socket.emit('move_token', { roomId, tokenId });
      }
    }
  };

  const handleRollDice = () => {
    socket.emit('roll_dice', { roomId });
  };

  if (!roomData || !roomData.gameState) return <div style={{ color: 'white', textAlign: 'center', marginTop: '3rem' }}>Loading Game...</div>;

  const gameState = roomData.gameState;
  const activePlayer = gameState.players[gameState.turnIndex];
  const isMyTurn = activePlayer.id === socket.id;

  const isClassic = gameState.players.length <= 4;
  const activeColors = isClassic ? classicColors : starColors;
  const localPlayer = gameState.players.find(p => p.id === socket.id);
  const localColorIndex = localPlayer ? (localPlayer.colorIndex % 4) : 0;

  const getScreenCornerStyle = (colorIndex, isActiveTurn) => {
    // Determine screen corner based on rotation
    const diff = (colorIndex - localColorIndex + 4) % 4;
    const playerColor = activeColors[colorIndex % activeColors.length];

    const baseStyle = { 
      position: 'absolute', display: 'flex', alignItems: 'center', gap: '1rem', 
      padding: '1rem', borderRadius: '16px', 
      background: isActiveTurn ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)', 
      backdropFilter: 'blur(10px)', 
      // ONLY apply the bright colored border to the ACTIVE player. Inactive players get a subtle grey/transparent border.
      border: isActiveTurn ? `3px solid ${playerColor}` : `1px solid rgba(255,255,255,0.1)`, 
      zIndex: isActiveTurn ? 20 : 10,
    };

    switch(diff) {
      case 0: return { ...baseStyle, bottom: '2rem', left: '2rem', flexDirection: 'row' }; // Bottom-Left (Local)
      case 1: return { ...baseStyle, top: '5rem', left: '2rem', flexDirection: 'row' };    // Top-Left
      case 2: return { ...baseStyle, top: '5rem', right: '2rem', flexDirection: 'row-reverse' }; // Top-Right
      case 3: return { ...baseStyle, bottom: '2rem', right: '2rem', flexDirection: 'row-reverse' }; // Bottom-Right
      default: return baseStyle;
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100vh', padding: '1rem', overflow: 'hidden', background: '#0f172a', color: 'white' }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '1rem', flexShrink: 0, zIndex: 20 }}>
        <h1 style={{ margin: 0, fontSize: '2rem', background: 'linear-gradient(to right, #a855f7, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Room: {roomId}
        </h1>
        <p style={{ margin: '0.5rem 0 0 0', color: '#94a3b8', fontSize: '1.2rem', minHeight: '1.5rem' }}>{gameState.lastAction}</p>
      </div>

      {/* Main Layout */}
      <div style={{ display: 'flex', flex: 1, gap: '2rem', overflow: 'hidden', justifyContent: 'center', alignItems: 'stretch', position: 'relative' }}>
        
        {/* Render Sidebar only if NOT classic */}
        {!isClassic && (
          <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '1.5rem', flexShrink: 0 }}>
            {/* Players List */}
            <div className="modern-glass" style={{ padding: '1rem', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', flex: 1, overflowY: 'auto' }}>
              <h3 style={{ marginTop: 0, color: '#e2e8f0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Players</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {gameState.players.map(p => (
                  <li key={p.id} style={{ 
                    padding: '0.8rem', 
                    background: p.id === activePlayer.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${activeColors[p.colorIndex % activeColors.length]}`,
                    marginBottom: '0.5rem',
                    fontSize: '1.1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{p.name}</span>
                    {p.id === socket.id && <span style={{ fontSize: '0.8rem', color: '#a855f7', fontWeight: 'bold' }}>YOU</span>}
                  </li>
                ))}
              </ul>
            </div>

            {/* Dice & Turn Actions */}
            <div className="modern-glass" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', borderRadius: '16px', background: 'rgba(255,255,255,0.05)' }}>
              <h3 style={{ margin: 0, color: '#d8b4fe' }}>Turn: {activePlayer.name}</h3>
              <Dice value={gameState.diceRoll || 1} rollTrigger={rollTrigger} />
              <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center' }}>
                {isMyTurn && gameState.state === 'waiting_for_roll' && (
                  <button className="primary-btn" onClick={handleRollDice} style={{ padding: '0.8rem 2rem', fontSize: '1.2rem', width: '100%' }}>
                    Roll Dice
                  </button>
                )}
                {isMyTurn && gameState.state === 'waiting_for_move' && (
                  <p style={{ color: '#34d399', fontWeight: 'bold', margin: 0, textAlign: 'center' }}>Select a token to move</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Board Area */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0, position: 'relative' }}>
          
          {/* Render Corner Avatars if Classic */}
          {isClassic && gameState.players.map(p => {
            const isThisPlayersTurn = p.id === activePlayer.id;
            const playerColor = activeColors[p.colorIndex % activeColors.length];

            // Only pulse the glowing shadow if it's their turn
            const pulseAnimation = isThisPlayersTurn ? {
              boxShadow: [
                `0 0 10px ${playerColor}80, inset 0 0 10px ${playerColor}40`,
                `0 0 50px ${playerColor}, inset 0 0 30px ${playerColor}`,
                `0 0 10px ${playerColor}80, inset 0 0 10px ${playerColor}40`
              ],
              scale: [1, 1.05, 1]
            } : {
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
              scale: 1
            };

            return (
              <motion.div 
                key={p.id} 
                style={getScreenCornerStyle(p.colorIndex, isThisPlayersTurn)}
                animate={pulseAnimation}
                transition={isThisPlayersTurn ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" } : { duration: 0.3 }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', opacity: isThisPlayersTurn ? 1 : 0.6 }}>{p.name}</span>
                  {p.id === socket.id && <span style={{ fontSize: '0.8rem', color: '#a855f7', fontWeight: 'bold', opacity: isThisPlayersTurn ? 1 : 0.6 }}>YOU</span>}
                  
                  {isThisPlayersTurn && isMyTurn && gameState.state === 'waiting_for_roll' && (
                    <button className="primary-btn" onClick={handleRollDice} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                      Roll
                    </button>
                  )}
                  {isThisPlayersTurn && isMyTurn && gameState.state === 'waiting_for_move' && (
                    <span style={{ color: '#34d399', fontSize: '0.8rem', marginTop: '0.5rem' }}>Move token</span>
                  )}
                </div>
                
                {/* Scaled down dice for the player. Dim it heavily if it's not their turn! */}
                <div style={{ transform: 'scale(0.6)', transformOrigin: 'center', opacity: isThisPlayersTurn ? 1 : 0.3, transition: 'opacity 0.3s' }}>
                  <Dice value={isThisPlayersTurn ? (gameState.diceRoll || 1) : 1} rollTrigger={isThisPlayersTurn ? rollTrigger : 0} />
                </div>
              </motion.div>
            );
          })}

          <div style={{ width: '100%', height: '100%', maxWidth: '800px', maxHeight: '800px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {isClassic ? (
              <BoardClassic gameState={gameState} onTokenClick={handleTokenClick} localPlayerId={socket.id} />
            ) : (
              <Board players={gameState.players} onTokenClick={handleTokenClick} localPlayerId={socket.id} />
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Game;
