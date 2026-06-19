const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const LudoEngine = require('./engine');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend/dist')));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', // For development, allow all origins
    methods: ['GET', 'POST']
  }
});

// In-memory data store for lobbies and games
const rooms = {};

// Helper to sanitize room object before emitting to prevent circular reference/Timeout crashes
function getSafeRoom(room) {
  if (!room) return null;
  return {
    id: room.id,
    maxPlayers: room.maxPlayers,
    players: room.players,
    status: room.status,
    gameState: room.gameState
  };
}

// Helper to manage turn timers
function setupTurnTimer(roomId, io) {
  const room = rooms[roomId];
  if (!room || !room.engine || room.engine.state === 'finished') return;
  
  if (room.turnTimer) clearTimeout(room.turnTimer);
  
  const delay = Math.max(0, room.engine.turnDeadline - Date.now());
  
  room.turnTimer = setTimeout(() => {
    if (rooms[roomId] && rooms[roomId].engine) {
      if ((rooms[roomId].engine.state === 'waiting_for_roll' || rooms[roomId].engine.state === 'waiting_for_move') && Date.now() >= rooms[roomId].engine.turnDeadline - 100) {
        const skipped = rooms[roomId].engine.autoSkipTurn();
        if (skipped) {
          rooms[roomId].gameState = rooms[roomId].engine.getState();
          if (rooms[roomId].engine.state === 'finished') rooms[roomId].status = 'finished';
          io.to(roomId).emit('room_update', getSafeRoom(rooms[roomId]));
          setupTurnTimer(roomId, io);
        }
      }
    }
  }, delay);
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create or Join Room
  socket.on('join_room', ({ roomId, playerName, maxPlayers, playerId, isCreating }) => {
    // If room doesn't exist, create it
    if (!rooms[roomId]) {
      if (isCreating === false) {
        socket.emit('error_message', `Room ${roomId} does not exist. Please check the code.`);
        return;
      }
      const parsedMax = parseInt(maxPlayers) || 6;
      rooms[roomId] = {
        id: roomId,
        maxPlayers: Math.min(Math.max(parsedMax, 2), 6), // between 2 and 6
        players: [], // Array of player objects
        status: 'lobby', // 'lobby' | 'playing' | 'finished'
        gameState: null, // Will hold the board state later
        timeout: setTimeout(() => {
          if (rooms[roomId]) {
            delete rooms[roomId];
            console.log(`Room ${roomId} forcefully deleted after 3 hours.`);
          }
        }, 3 * 60 * 60 * 1000) // 3 hours
      };
    } else if (isCreating) {
      // Prevent creating a room that already exists unless reconnecting
      const existing = rooms[roomId].players.find(p => p.persistentId === playerId);
      if (!existing && rooms[roomId].players.length > 0) {
        socket.emit('error_message', `Room ${roomId} already exists. Please join it instead.`);
        return;
      }
    }

    const room = rooms[roomId];

    // Check if player is already in this room by persistentId (prevent double joining via same socket)
    const existingPlayer = room.players.find(p => p.persistentId === playerId);
    if (existingPlayer) {
       // Update socket id for the reconnected player!
       existingPlayer.id = socket.id;
       existingPlayer.connected = true;
       if (room.engine) {
          const enginePlayer = room.engine.players.find(p => p.persistentId === playerId);
          if (enginePlayer) {
             enginePlayer.id = socket.id;
          }
          room.gameState = room.engine.getState();
       }
       socket.join(roomId);
       io.to(roomId).emit('room_update', getSafeRoom(room));
       return;
    }

    // Max players check
    if (room.players.length >= room.maxPlayers) {
      socket.emit('error_message', `Room is full! Maximum ${room.maxPlayers} players allowed.`);
      return;
    }

    room.players.push({
      id: socket.id,
      persistentId: playerId,
      name: playerName,
      color: null, // Assigned later
      isReady: false,
      connected: true
    });

    socket.join(roomId);
    
    // Broadcast updated room state to everyone in the room
    io.to(roomId).emit('room_update', getSafeRoom(room));
    console.log(`${playerName} (${socket.id}) joined room: ${roomId}`);
  });

  // Handle player ready state
  socket.on('toggle_ready', ({ roomId }) => {
    const room = rooms[roomId];
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.isReady = !player.isReady;
        io.to(roomId).emit('room_update', getSafeRoom(room));
      }
    }
  });

  // Handle start game
  socket.on('start_game', ({ roomId }) => {
    const room = rooms[roomId];
    if (room && room.players.length >= 2) {
      // Check if user is host (first player in array)
      if (room.players[0].id === socket.id) {
        const allReady = room.players.every(p => p.isReady);
        if (allReady) {
          room.status = 'playing';
          room.engine = new LudoEngine(room.players);
          room.gameState = room.engine.getState();
          io.to(roomId).emit('game_started', getSafeRoom(room));
          io.to(roomId).emit('room_update', getSafeRoom(room));
          setupTurnTimer(roomId, io);
        } else {
          socket.emit('error_message', 'Not all players are ready.');
        }
      } else {
        socket.emit('error_message', 'Only the host can start the game.');
      }
    } else {
      socket.emit('error_message', 'Need at least 2 players to start.');
    }
  });

  // Get current room state
  socket.on('get_room_state', ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (room) {
      if (playerId) {
         // Update socket id if the player is reconnecting directly to the game page
         const existingPlayer = room.players.find(p => p.persistentId === playerId);
         if (existingPlayer) {
            existingPlayer.id = socket.id;
         }
         if (room.engine) {
            const enginePlayer = room.engine.players.find(p => p.persistentId === playerId);
            if (enginePlayer) {
               enginePlayer.id = socket.id;
            }
            room.gameState = room.engine.getState();
         }
      } else {
         if (room.engine) room.gameState = room.engine.getState();
      }
      
      socket.join(roomId); // Ensure they are in the socket room!
      socket.emit('room_update', getSafeRoom(room));
    } else {
      socket.emit('room_not_found');
    }
  });

  // Game Actions
  socket.on('roll_dice', ({ roomId }) => {
    const room = rooms[roomId];
    if (room && room.engine) {
      const success = room.engine.rollDice(socket.id);
      if (success) {
        room.gameState = room.engine.getState();
        if (room.engine.state === 'finished') room.status = 'finished';
        io.to(roomId).emit('room_update', getSafeRoom(room));
        
        if (room.engine.state === 'waiting_for_move') {
          setupTurnTimer(roomId, io);
        }

        if (room.engine.state === 'animating_roll') {
          setTimeout(() => {
            if (rooms[roomId] && rooms[roomId].engine) {
              rooms[roomId].engine.completeRollAnimation();
              rooms[roomId].gameState = rooms[roomId].engine.getState();
              if (rooms[roomId].engine.state === 'finished') rooms[roomId].status = 'finished';
              io.to(roomId).emit('room_update', getSafeRoom(rooms[roomId]));
              setupTurnTimer(roomId, io);
            }
          }, 1500); // 1.5s delay to let dice roll animation finish
        }
      }
    }
  });

  socket.on('move_token', ({ roomId, tokenId }) => {
    const room = rooms[roomId];
    if (room && room.engine) {
      const success = room.engine.moveToken(socket.id, tokenId);
      if (success) {
        room.gameState = room.engine.getState();
        io.to(roomId).emit('room_update', getSafeRoom(room));

        if (room.engine.state === 'animating') {
          const delay = room.engine.animationDuration || 1500;
          setTimeout(() => {
            // Check if room still exists and engine state hasn't been corrupted
            if (rooms[roomId] && rooms[roomId].engine) {
              rooms[roomId].engine.completeAnimation();
              rooms[roomId].gameState = rooms[roomId].engine.getState();
              if (rooms[roomId].engine.state === 'finished') rooms[roomId].status = 'finished';
              io.to(roomId).emit('room_update', getSafeRoom(rooms[roomId]));
              setupTurnTimer(roomId, io);

              if (rooms[roomId].engine.state === 'celebrating') {
                setTimeout(() => {
                  if (rooms[roomId] && rooms[roomId].engine) {
                     rooms[roomId].engine.completeCelebration();
                     rooms[roomId].gameState = rooms[roomId].engine.getState();
                     if (rooms[roomId].engine.state === 'finished') rooms[roomId].status = 'finished';
                     io.to(roomId).emit('room_update', getSafeRoom(rooms[roomId]));
                     setupTurnTimer(roomId, io);
                  }
                }, 6000);
              }
            }
          }, delay);
        }
      }
    }
  });

  socket.on('kick_player', ({ roomId, targetPlayerId }) => {
    const room = rooms[roomId];
    if (room && room.engine) {
      // Verify sender is the host (creator is players[0])
      const host = room.players[0];
      if (host && host.id === socket.id) {
        const success = room.engine.kickPlayer(targetPlayerId);
        if (success) {
          // Also mark them as disconnected to prevent them doing things if they are still connected
          const pIndex = room.players.findIndex(p => p.persistentId === targetPlayerId);
          if (pIndex !== -1) room.players[pIndex].connected = false;

          room.gameState = room.engine.getState();
          if (room.engine.state === 'finished') room.status = 'finished';
          io.to(roomId).emit('room_update', getSafeRoom(room));
          setupTurnTimer(roomId, io);
        }
      }
    }
  });

  // Handle Disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // Find which room the user was in and remove them
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        // Player found in this room
        if (room.status === 'playing') {
          // Keep player in memory so they can reconnect during active game
          room.players[playerIndex].connected = false;
        } else {
          // Lobby or Finished: completely remove them
          room.players.splice(playerIndex, 1);
        }
        
        // Notify remaining players
        io.to(roomId).emit('room_update', getSafeRoom(room));

        // Check if room is completely empty
        const activeCount = room.players.filter(p => p.connected !== false).length;
        if (activeCount === 0) {
          if (room.status === 'playing') {
            console.log(`Room ${roomId} is empty but playing. Keeping alive for reconnection.`);
          } else {
            clearTimeout(room.timeout);
            delete rooms[roomId];
            console.log(`Room ${roomId} deleted (empty and not playing)`);
          }
        }
        break; // A socket is usually only in one custom game room
      }
    }
  });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend Server running on port ${PORT}`);
});
