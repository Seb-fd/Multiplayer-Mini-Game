import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
});

const PORT = process.env.PORT || 3001;

// Game Constants
const MAP_WIDTH = 760;
const MAP_HEIGHT = 512;
const PLAYER_SIZE = 24;
const RADIUS = PLAYER_SIZE / 2;
const SPEED = 20;
const MAX_PLAYERS_PER_ROOM = 4;
const WINNING_SCORE = 50;

// Game State
const players = new Map();
const coins = new Map();

// Helpers
function randomPos() {
  return {
    x: Math.random() * (MAP_WIDTH - PLAYER_SIZE) + RADIUS,
    y: Math.random() * (MAP_HEIGHT - PLAYER_SIZE) + RADIUS,
  };
}

// Spawn a new coin at a random position
function spawnCoin() {
  const id = `coin-${Math.random().toString(36).substr(2, 5)}`;
  coins.set(id, { id, ...randomPos() });
}

// Initial coins
for (let i = 0; i < 5; i++) spawnCoin();

// Get all players in a specific room
function getRoomPlayers(gameId) {
  const room = io.sockets.adapter.rooms.get(gameId);
  if (!room) return [];
  return Array.from(room).map((id) => {
    const player = players.get(id);
    return player
      ? {
          id: player.id,
          name: player.name,
          x: player.x,
          y: player.y,
          score: player.score || 0,
        }
      : { id, name: "Unknown", x: 0, y: 0, score: 0 };
  });
}

// Send updated player list to the room
function updateRoomPlayers(gameId) {
  const list = getRoomPlayers(gameId);
  io.to(gameId).emit("players-update", list);
}

// Send updated coins to all clients
function updateCoins() {
  io.emit("coins-update", Array.from(coins.values()));
}

// Socket Logic
io.on("connection", (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  // Create a new player object
  const player = {
    id: socket.id,
    name: `Player-${socket.id.slice(0, 4)}`,
    x: Math.random() * (MAP_WIDTH - PLAYER_SIZE) + RADIUS,
    y: Math.random() * (MAP_HEIGHT - PLAYER_SIZE) + RADIUS,
    gameId: null,
    keysPressed: new Set(),
    isMouseDown: false,
    target: null,
    score: 0,
  };
  players.set(socket.id, player);

  // Join Game with player limit
  socket.on("join-game", ({ gameId, name }) => {
    if (!gameId || !name) return;

    const room = io.sockets.adapter.rooms.get(gameId);
    const numPlayers = room ? room.size : 0;
    if (numPlayers >= MAX_PLAYERS_PER_ROOM) {
      socket.emit("join-error", { message: "Room full (max 4 players)" });
      return;
    }

    socket.join(gameId);
    player.name = name;
    player.gameId = gameId;

    const list = getRoomPlayers(gameId);
    socket.emit("joined", { gameId, players: list });
    socket.to(gameId).emit("players-update", list);
    updateCoins();
  });

  socket.on("leave-game", ({ gameId }) => {
    if (!gameId) return;
    socket.leave(gameId);
    player.gameId = null;
    player.keysPressed.clear();
    updateRoomPlayers(gameId);
    socket.emit("left");
  });

  // Movement Input
  socket.on("move", (dir) => player.keysPressed.add(dir));
  socket.on("stop", (dir) => player.keysPressed.delete(dir));

  // Coin Collection
  socket.on("collect", ({ coinId }) => {
    if (!coins.has(coinId)) return;

    coins.delete(coinId);
    player.score = (player.score || 0) + 1;

    // Win condition
    if (player.score >= WINNING_SCORE) {
      io.to(player.gameId).emit("game-over", {
        winner: player.name,
        winnerId: player.id,
      });

      // Reset all player scores AND positions
      getRoomPlayers(player.gameId).forEach((p) => {
        const pl = players.get(p.id);
        if (pl) {
          const pos = randomPos();
          pl.score = 0;
          pl.x = pos.x;
          pl.y = pos.y;
        }
      });

      // Respawn coins
      coins.clear();
      for (let i = 0; i < 5; i++) spawnCoin();

      updateRoomPlayers(player.gameId);
      updateCoins();

      // Emit game-reset to trigger sounds/effects
      io.to(player.gameId).emit("game-reset");
      return;
    }

    updateRoomPlayers(player.gameId);
    spawnCoin();
    updateCoins();
  });

  // Reset Game
  socket.on("reset-game", () => {
    if (!player.gameId) return;

    // Reset all player scores AND positions
    getRoomPlayers(player.gameId).forEach((p) => {
      const pl = players.get(p.id);
      if (pl) {
        const pos = randomPos();
        pl.score = 0;
        pl.x = pos.x;
        pl.y = pos.y;
      }
    });

    // Respawn coins
    coins.clear();
    for (let i = 0; i < 5; i++) spawnCoin();

    updateRoomPlayers(player.gameId);
    updateCoins();
    io.to(player.gameId).emit("game-reset");
  });

  // Movement Loop
  const interval = setInterval(() => {
    if (!player.gameId) return;

    let dx = 0,
      dy = 0;

    // Keyboard movement
    if (player.keysPressed.has("up")) dy -= SPEED;
    if (player.keysPressed.has("down")) dy += SPEED;
    if (player.keysPressed.has("left")) dx -= SPEED;
    if (player.keysPressed.has("right")) dx += SPEED;

    // Mouse movement (only while holding down)
    if (player.isMouseDown && player.target) {
      const diffX = player.target.x - player.x;
      const diffY = player.target.y - player.y;
      const distance = Math.sqrt(diffX * diffX + diffY * diffY);

      if (distance > 0) {
        const moveX = (diffX / distance) * SPEED;
        const moveY = (diffY / distance) * SPEED;

        player.x += Math.abs(moveX) > Math.abs(diffX) ? diffX : moveX;
        player.y += Math.abs(moveY) > Math.abs(diffY) ? diffY : moveY;

        if (distance <= SPEED) player.target = null;
      }
    }

    if (dx && dy) {
      dx /= Math.sqrt(2);
      dy /= Math.sqrt(2);
    }

    player.x = Math.min(Math.max(RADIUS, player.x + dx), MAP_WIDTH - RADIUS);
    player.y = Math.min(Math.max(RADIUS, player.y + dy), MAP_HEIGHT - RADIUS);

    players.set(socket.id, player);
    updateRoomPlayers(player.gameId);
  }, 50);

  // Mouse Events
  socket.on("mouse-down", ({ x, y }) => {
    player.isMouseDown = true;
    player.target = { x, y };
  });

  socket.on("mouse-move", ({ x, y }) => {
    if (player.isMouseDown) player.target = { x, y };
  });

  socket.on("mouse-up", () => {
    player.isMouseDown = false;
    player.target = null;
  });

  // Disconnect
  socket.on("disconnect", () => {
    clearInterval(interval);
    players.delete(socket.id);
    if (player.gameId) updateRoomPlayers(player.gameId);
  });
});

// Server Start
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
