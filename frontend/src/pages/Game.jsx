import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { socket } from './Lobby';
import Board from '../components/Board';
import BoardClassic from '../components/BoardClassic';
import Dice from '../components/Dice';
import { playSound } from '../utils/audio';

const classicColors = ['#EB1C24', '#66CCFF', '#FFE013', '#02A04B'];
const starColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#06b6d4'];

const CelebrationOverlay = ({ winner }) => {
  useEffect(() => {
    const duration = 8000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 2000 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);

    return () => clearInterval(interval);
  }, []);

  if (!winner) return null;
  
  const rank = winner.rank;
  const isFirst = rank === 1;
  const color = isFirst ? '#ffd700' : rank === 2 ? '#c0c0c0' : '#cd7f32';
  const text = isFirst ? '1ST PLACE!' : rank === 2 ? '2ND PLACE!' : '3RD PLACE!';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(circle at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.95) 100%)',
        backdropFilter: 'blur(10px)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        zIndex: 1000, pointerEvents: 'none', overflow: 'hidden'
      }}
    >
      {/* Rotating Sunburst / Aura */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
        style={{
          position: 'absolute',
          width: '200vw', height: '200vw',
          background: `conic-gradient(from 0deg, transparent 0deg, ${color}22 15deg, transparent 30deg, ${color}22 45deg, transparent 60deg, ${color}22 75deg, transparent 90deg, ${color}22 105deg, transparent 120deg, ${color}22 135deg, transparent 150deg, ${color}22 165deg, transparent 180deg, ${color}22 195deg, transparent 210deg, ${color}22 225deg, transparent 240deg, ${color}22 255deg, transparent 270deg, ${color}22 285deg, transparent 300deg, ${color}22 315deg, transparent 330deg, ${color}22 345deg, transparent 360deg)`,
        }}
      />

      {/* Floating Particles */}
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: '100vh', x: `${Math.random() * 100}vw`, scale: Math.random() * 1.5 }}
          animate={{ y: '-100vh', rotate: 360 }}
          transition={{ duration: 3 + Math.random() * 4, repeat: Infinity, ease: "linear", delay: Math.random() * 3 }}
          style={{
            position: 'absolute', width: '15px', height: '15px',
            background: Math.random() > 0.5 ? color : '#ffffff', 
            borderRadius: '50%', opacity: 0.2 + Math.random() * 0.6,
            boxShadow: `0 0 15px ${color}`
          }}
        />
      ))}

      {/* Main Badge / Rank */}
      <motion.div
        initial={{ scale: 0, y: -50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 150, damping: 15 }}
        style={{
           display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10
        }}
      >
        <motion.h2
          initial={{ opacity: 0, y: -20, letterSpacing: '0px' }}
          animate={{ opacity: 1, y: 0, letterSpacing: '8px' }}
          transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
          style={{ 
            color: 'white', fontSize: '2.5rem', margin: '0 0 1rem 0', 
            textTransform: 'uppercase', opacity: 0.9, textShadow: '0 4px 10px rgba(0,0,0,0.8)'
          }}
        >
          <span style={{ color }}>{winner.name}</span> finished
        </motion.h2>

        <motion.div
          animate={{ y: [-10, 10, -10], scale: [1, 1.02, 1] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        >
          <motion.h1
            initial={{ scale: 0, rotateX: 90 }}
            animate={{ scale: 1, rotateX: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 10, delay: 0.2 }}
            style={{
              fontSize: isFirst ? '10rem' : '7rem',
              margin: 0, textAlign: 'center', fontFamily: 'Impact, sans-serif',
              lineHeight: '1.1', textTransform: 'uppercase',
              background: `linear-gradient(180deg, #ffffff 0%, ${color} 50%, #ffffff 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: `drop-shadow(0 4px 15px ${color})`
            }}
          >
            {text}
          </motion.h1>
        </motion.div>

        {/* Epic Underline/Flourish */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 1, duration: 0.8, ease: "easeOut" }}
          style={{
            width: '140%', height: '6px', 
            background: `linear-gradient(90deg, transparent, ${color}, white, ${color}, transparent)`,
            marginTop: '1rem', borderRadius: '50%',
            boxShadow: `0 0 20px ${color}, 0 0 40px ${color}`
          }}
        />
      </motion.div>
    </motion.div>
  );
};

const Game = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState(null);
  const localPlayerId = localStorage.getItem('ludo_player_id');
  
  const [rollTrigger, setRollTrigger] = useState(0);
  const [prevAction, setPrevAction] = useState('');

  useEffect(() => {
    // Request current state when loading the game page
    socket.emit('get_room_state', { roomId, playerId: localPlayerId });

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

  const [prevCelebrating, setPrevCelebrating] = useState(false);
  const winAudioRef = useRef(null);

  useEffect(() => {
    if (roomData && roomData.gameState) {
      const action = roomData.gameState.lastAction;
      if (action !== prevAction) {
        if (action.includes('rolled a')) {
          setRollTrigger(prev => prev + 1);
          playSound('dice_roll');
        }
        setPrevAction(action);
      }

      const isCelebrating = roomData.gameState.state === 'celebrating';
      if (isCelebrating && !prevCelebrating) {
        winAudioRef.current = playSound('dude_oorum_blood'); // Play win audio for 1st/2nd/3rd place!
      } else if (!isCelebrating && prevCelebrating) {
        if (winAudioRef.current) {
          winAudioRef.current.stop();
          winAudioRef.current = null;
        }
      }
      setPrevCelebrating(isCelebrating);
    }
  }, [roomData, prevAction, prevCelebrating]);

  useEffect(() => {
    if (roomData && roomData.gameState && roomData.gameState.state === 'waiting_for_move') {
      const gameState = roomData.gameState;
      const activePlayer = gameState.players[gameState.turnIndex];
      
      // Auto move if there is exactly 1 valid move
      if (activePlayer.id === socket.id && gameState.validMoves && gameState.validMoves.length === 1) {
        // Ensure dice animation has time to finish (600ms) before snapping the piece
        const timer = setTimeout(() => {
          socket.emit('move_token', { roomId, tokenId: gameState.validMoves[0] });
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [roomData, roomId]);

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
      case 2: return { ...baseStyle, top: '5rem', right: '2rem', flexDirection: 'row' }; // Top-Right
      case 3: return { ...baseStyle, bottom: '2rem', right: '2rem', flexDirection: 'row' }; // Bottom-Right
      default: return baseStyle;
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100vh', padding: '1rem', overflow: 'hidden', background: '#0f172a', color: 'white' }}>
      
      {/* Celebration Overlay */}
      <AnimatePresence>
        {gameState.state === 'celebrating' && (
          <CelebrationOverlay winner={gameState.lastWinner} />
        )}
      </AnimatePresence>

      {/* Game Over Leaderboard / Loser Tease */}
      {gameState.state === 'finished' && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.95)', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <motion.h1 
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            style={{ color: '#ffd700', fontSize: '4rem', margin: 0, marginBottom: '2rem', textShadow: '0 0 20px rgba(255, 215, 0, 0.5)' }}
          >
            Game Over!
          </motion.h1>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '400px' }}>
            {gameState.players.slice().sort((a, b) => {
               // Kicked players go to very bottom
               if (a.isKicked && !b.isKicked) return 1;
               if (!a.isKicked && b.isKicked) return -1;
               // Ranked players go first
               return (a.rank || 99) - (b.rank || 99);
            }).map(p => (
              <motion.div 
                key={p.id} 
                initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                style={{
                  background: 'rgba(255,255,255,0.1)', padding: '1rem 2rem', borderRadius: '12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderLeft: `6px solid ${activeColors[p.colorIndex % activeColors.length]}`,
                  opacity: p.isKicked ? 0.4 : 1
                }}
              >
                <span style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold', textDecoration: p.isKicked ? 'line-through' : 'none' }}>{p.name}</span>
                <span style={{ 
                  color: p.rank === 1 ? '#ffd700' : p.rank === 2 ? '#c0c0c0' : p.rank === 3 ? '#cd7f32' : p.isKicked ? '#ef4444' : '#ef4444',
                  fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}>
                  {p.isKicked ? 'KICKED' : p.rank ? (
                    `${p.rank}${p.rank === 1 ? 'st' : p.rank === 2 ? 'nd' : p.rank === 3 ? 'rd' : 'th'} Place`
                  ) : (
                    <motion.div animate={{ y: [0, -10, 0], scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                      LOSER 💩
                    </motion.div>
                  )}
                </span>
              </motion.div>
            ))}
          </div>
          
          <button 
            onClick={() => navigate('/')}
            style={{ marginTop: '3rem', padding: '1rem 3rem', fontSize: '1.2rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseOver={e => e.target.style.background = '#2563eb'}
            onMouseOut={e => e.target.style.background = '#3b82f6'}
          >
            Back to Lobby
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '1rem', flexShrink: 0, zIndex: 20 }}>
        <h1 style={{ margin: 0, fontSize: '2rem', background: 'linear-gradient(to right, #a855f7, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Room: {roomId}
        </h1>
      </div>

      {/* Main Layout */}
      <div style={{ display: 'flex', flex: 1, gap: '2rem', overflow: 'hidden', justifyContent: 'center', alignItems: 'stretch', position: 'relative' }}>
        
        {/* Render Sidebar only if NOT classic */}
        {!isClassic && (
          <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '1.5rem', flexShrink: 0 }}>
            {/* Players List */}
            <div className="modern-glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '16px', overflowY: 'auto', flex: 1 }}>
              <h3 style={{ marginTop: 0, color: '#e2e8f0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Players</h3>
              {gameState.players.map((p, idx) => {
                const isThisPlayersTurn = gameState.turnIndex === idx;
                const isMe = p.id === socket.id;
                const isHost = roomData.players[0] && roomData.players[0].persistentId === localPlayerId;
                const isKicked = p.isKicked;
                const playerColor = activeColors[p.colorIndex % activeColors.length];

                return (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    opacity: (isThisPlayersTurn || roomData.status === 'lobby') && !isKicked ? 1 : 0.5,
                    transition: 'opacity 0.3s ease',
                    background: isThisPlayersTurn ? 'rgba(255,255,255,0.1)' : 'transparent',
                    padding: '0.5rem', borderRadius: '12px'
                  }}>
                    <div style={{ position: 'relative', width: '54px', height: '54px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                      {/* The Golden Timer Ring */}
                      {isThisPlayersTurn && !isKicked && gameState.turnDeadline && (
                        <svg width="54" height="54" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
                          <motion.circle
                            key={gameState.turnDeadline}
                            cx="27" cy="27" r="25"
                            stroke="#ffd700" strokeWidth="3" fill="transparent"
                            strokeDasharray={2 * Math.PI * 25}
                            initial={{ strokeDashoffset: 0 }}
                            animate={{ strokeDashoffset: 2 * Math.PI * 25 }}
                            transition={{ duration: Math.max(0, gameState.turnDeadline - Date.now()) / 1000, ease: "linear" }}
                          />
                        </svg>
                      )}
                      
                      <div style={{
                        width: '46px', height: '46px', borderRadius: '50%',
                        backgroundColor: isKicked ? '#555' : playerColor,
                        border: isThisPlayersTurn ? '2px solid white' : '2px solid transparent',
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        color: 'white', fontWeight: 'bold', fontSize: '1rem',
                        zIndex: 1
                      }}>
                        {p.name.substring(0, 2).toUpperCase()}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <span style={{ fontWeight: 'bold', color: isKicked ? '#ef4444' : 'white', textDecoration: isKicked ? 'line-through' : 'none' }}>
                        {p.name} {isMe && '(You)'}
                      </span>
                      {isHost && !isMe && !isKicked && roomData.status === 'playing' && (
                        <button onClick={() => socket.emit('kick_player', { roomId, targetPlayerId: p.persistentId })}
                          style={{ marginTop: '4px', padding: '2px 8px', fontSize: '0.7rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', alignSelf: 'flex-start' }}
                        >Kick</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dice & Turn Actions */}
            <div className="modern-glass" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', borderRadius: '16px', background: 'rgba(255,255,255,0.05)' }}>
              <div 
                style={{ cursor: (isMyTurn && gameState.state === 'waiting_for_roll') ? 'pointer' : 'default' }}
                onClick={(isMyTurn && gameState.state === 'waiting_for_roll') ? handleRollDice : undefined}
              >
                <Dice value={gameState.diceRoll || 1} rollTrigger={rollTrigger} />
              </div>
              <h3 style={{ margin: 0, color: '#d8b4fe' }}>{activePlayer.name}</h3>
              <div style={{ minHeight: '30px', display: 'flex', alignItems: 'center', marginTop: '0.5rem' }}>
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
                {/* Dice on top */}
                <div 
                  style={{ 
                    transform: 'scale(0.8)', 
                    transformOrigin: 'center', 
                    opacity: isThisPlayersTurn ? 1 : 0, 
                    pointerEvents: isThisPlayersTurn ? 'auto' : 'none',
                    transition: 'opacity 0.3s',
                    cursor: (isThisPlayersTurn && isMyTurn && gameState.state === 'waiting_for_roll') ? 'pointer' : 'default'
                  }}
                  onClick={(isThisPlayersTurn && isMyTurn && gameState.state === 'waiting_for_roll') ? handleRollDice : undefined}
                >
                  <Dice value={isThisPlayersTurn ? (gameState.diceRoll || 1) : 1} rollTrigger={rollTrigger} />
                </div>
                
                {/* Player info and Timer Profile */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  
                  {/* Player Profile Picture with Timer Ring */}
                  <div style={{ position: 'relative', width: '68px', height: '68px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {isThisPlayersTurn && !p.isKicked && gameState.turnDeadline && (
                      <svg width="68" height="68" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
                        <motion.circle
                          key={gameState.turnDeadline}
                          cx="34" cy="34" r="32"
                          stroke="#ffd700" strokeWidth="4" fill="transparent"
                          strokeDasharray={2 * Math.PI * 32}
                          initial={{ strokeDashoffset: 0 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 32 }}
                          transition={{ duration: Math.max(0, gameState.turnDeadline - Date.now()) / 1000, ease: "linear" }}
                        />
                      </svg>
                    )}
                    <div style={{
                      width: '60px', height: '60px', borderRadius: '50%',
                      backgroundColor: p.isKicked ? '#555' : playerColor,
                      border: isThisPlayersTurn ? '2px solid white' : '2px solid transparent',
                      boxShadow: isThisPlayersTurn && !p.isKicked ? `0 0 15px ${playerColor}` : 'none',
                      display: 'flex', justifyContent: 'center', alignItems: 'center',
                      color: 'white', fontWeight: 'bold', fontSize: '1.4rem',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.5)', zIndex: 1
                    }}>
                      {p.name.substring(0, 2).toUpperCase()}
                    </div>
                  </div>

                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: p.isKicked ? '#ef4444' : 'white', opacity: isThisPlayersTurn ? 1 : 0.6, textDecoration: p.isKicked ? 'line-through' : 'none' }}>{p.name}</span>
                  {p.id === socket.id && <span style={{ fontSize: '0.8rem', color: '#a855f7', fontWeight: 'bold', opacity: isThisPlayersTurn ? 1 : 0.6 }}>YOU</span>}
                  
                  {isThisPlayersTurn && isMyTurn && gameState.state === 'waiting_for_move' && (
                    <span style={{ color: '#34d399', fontSize: '0.8rem', fontWeight: 'bold' }}>Move token</span>
                  )}

                  {/* Kick Button for Host */}
                  {roomData.players[0] && roomData.players[0].persistentId === localPlayerId && p.id !== socket.id && !p.isKicked && (
                    <button 
                      onClick={() => socket.emit('kick_player', { roomId, targetPlayerId: p.persistentId })}
                      style={{ marginTop: '4px', padding: '4px 12px', fontSize: '0.8rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >Kick</button>
                  )}
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
