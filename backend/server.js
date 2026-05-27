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

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create or Join Room
  socket.on('join_room', ({ roomId, playerName, maxPlayers, playerId }) => {
    // If room doesn't exist, create it
    if (!rooms[roomId]) {
      const parsedMax = parseInt(maxPlayers) || 6;
      rooms[roomId] = {
        id: roomId,
        maxPlayers: Math.min(Math.max(parsedMax, 2), 6), // between 2 and 6
        players: [], // Array of player objects
        status: 'lobby', // 'lobby' | 'playing' | 'finished'
        gameState: null // Will hold the board state later
      };
    }

    const room = rooms[roomId];

    // Check if player is already in this room by persistentId (prevent double joining via same socket)
    const existingPlayer = room.players.find(p => p.persistentId === playerId);
    if (existingPlayer) {
       // Update socket id for the reconnected player!
       existingPlayer.id = socket.id;
       if (room.engine) {
          const enginePlayer = room.engine.players.find(p => p.persistentId === playerId);
          if (enginePlayer) {
             enginePlayer.id = socket.id;
          }
          room.gameState = room.engine.getState();
       }
       socket.join(roomId);
       io.to(roomId).emit('room_update', room);
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
      isReady: false
    });

    socket.join(roomId);
    
    // Broadcast updated room state to everyone in the room
    io.to(roomId).emit('room_update', room);
    console.log(`${playerName} (${socket.id}) joined room: ${roomId}`);
  });

  // Handle player ready state
  socket.on('toggle_ready', ({ roomId }) => {
    const room = rooms[roomId];
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.isReady = !player.isReady;
        io.to(roomId).emit('room_update', room);
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
          io.to(roomId).emit('game_started', room);
          io.to(roomId).emit('room_update', room);
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
      socket.emit('room_update', room);
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
        io.to(roomId).emit('room_update', room);
      }
    }
  });

  socket.on('move_token', ({ roomId, tokenId }) => {
    const room = rooms[roomId];
    if (room && room.engine) {
      const success = room.engine.moveToken(socket.id, tokenId);
      if (success) {
        room.gameState = room.engine.getState();
        io.to(roomId).emit('room_update', room);
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
        room.players.splice(playerIndex, 1);
        
        // If room is empty, delete it
        if (room.players.length === 0) {
          delete rooms[roomId];
          console.log(`Room ${roomId} deleted (empty)`);
        } else {
          // Notify remaining players
          io.to(roomId).emit('room_update', room);
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
