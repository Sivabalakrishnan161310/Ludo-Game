import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import './Lobby.css';

export const socket = io(import.meta.env.DEV ? `http://${window.location.hostname}:3001` : '/');

const Lobby = () => {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [roomData, setRoomData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    socket.on('room_update', (data) => {
      setRoomData(data);
    });
    
    socket.on('game_started', (data) => {
      navigate(`/game/${data.id}`);
    });
    
    socket.on('error_message', (msg) => {
      alert(msg);
    });

    return () => {
      socket.off('room_update');
      socket.off('game_started');
      socket.off('error_message');
    };
  }, [navigate]);

  const [mode, setMode] = useState('select'); // 'select' | 'create' | 'join'

  const handleJoin = (e) => {
    e.preventDefault();
    if (playerName && roomId) {
      let playerId = localStorage.getItem('ludo_player_id');
      if (!playerId) {
         playerId = Math.random().toString(36).substring(2, 15);
         localStorage.setItem('ludo_player_id', playerId);
      }
      const isCreating = mode === 'create';
      socket.emit('join_room', { roomId, playerName, maxPlayers, playerId, isCreating });
    }
  };

  const handleReady = () => {
    socket.emit('toggle_ready', { roomId: roomData.id });
  };

  const handleStartGame = () => {
    socket.emit('start_game', { roomId: roomData.id });
  };

  if (roomData) {
    const isHost = roomData.players.length > 0 && roomData.players[0].id === socket.id;
    const allReady = roomData.players.every(p => p.isReady);
    const canStart = isHost && roomData.players.length >= 2 && allReady;

    return (
      <div className="lobby-container modern-glass">
        <h1 className="title">Room: {roomData.id}</h1>
        <p className="subtitle">Max Players: {roomData.maxPlayers}</p>
        <div className="players-list">
          {roomData.players.map((p, idx) => (
            <div key={p.id} className="player-card">
              <div className="player-info">
                <span className="player-name">{p.name}</span>
                {p.id === socket.id && <span className="you-badge">(You)</span>}
              </div>
              <span className={`status-badge ${p.isReady ? 'ready' : 'not-ready'}`}>
                {p.isReady ? 'Ready' : 'Waiting'}
              </span>
            </div>
          ))}
        </div>
        <button className="primary-btn mt-4" onClick={handleReady}>
          {roomData.players.find(p => p.id === socket.id)?.isReady ? 'Cancel Ready' : 'I am Ready!'}
        </button>
        {isHost && (
          <button 
            className="primary-btn mt-4 start-btn" 
            onClick={handleStartGame}
            disabled={!canStart}
            style={{ 
              opacity: canStart ? 1 : 0.5, 
              background: canStart ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '' 
            }}
          >
            Start Game
          </button>
        )}
        {!isHost && <p className="subtitle mt-4">Waiting for host to start...</p>}
      </div>
    );
  }

  if (mode === 'select') {
    return (
      <div className="lobby-container modern-glass" style={{ gap: '1rem' }}>
        <h1 className="title glow-text">Neon Ludo</h1>
        <p className="subtitle" style={{ marginBottom: '1rem' }}>Welcome! Choose an option</p>
        <button className="primary-btn" style={{ width: '100%' }} onClick={() => setMode('create')}>Create a Room</button>
        <button className="primary-btn" style={{ width: '100%', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }} onClick={() => setMode('join')}>Join a Room</button>
      </div>
    );
  }

  return (
    <div className="lobby-container modern-glass">
      <h1 className="title glow-text">{mode === 'create' ? 'Create Room' : 'Join Room'}</h1>
      <form onSubmit={handleJoin} className="join-form">
        <input 
          type="text" 
          placeholder="Your Name" 
          value={playerName} 
          onChange={(e) => setPlayerName(e.target.value)} 
          required 
          className="modern-input"
        />
        <input 
          type="text" 
          placeholder="Room Code" 
          value={roomId} 
          onChange={(e) => setRoomId(e.target.value)} 
          required 
          className="modern-input"
        />
        {mode === 'create' && (
          <div className="input-group">
            <label style={{ color: '#a0aec0', fontSize: '0.9rem' }}>Max Players (2-6):</label>
            <input 
              type="number" 
              min="2" 
              max="6" 
              value={maxPlayers} 
              onChange={(e) => setMaxPlayers(e.target.value)} 
              className="modern-input"
              style={{ width: '100%', marginTop: '0.5rem' }}
            />
          </div>
        )}
        <button type="submit" className="primary-btn" style={{ marginTop: '1rem' }}>
          {mode === 'create' ? 'Create Room' : 'Join Game'}
        </button>
        <button 
          type="button" 
          onClick={() => setMode('select')} 
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '1rem', borderRadius: '12px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: '600', transition: 'background 0.3s' }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
          onMouseOut={(e) => e.target.style.background = 'transparent'}
        >
          Back
        </button>
      </form>
    </div>
  );
};

export default Lobby;
