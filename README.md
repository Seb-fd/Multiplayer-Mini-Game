# Multiplayer Mini Game

A real-time multiplayer browser game built with **React**, **Vite**, **Socket.IO**, and **Node.js**. Players collect coins and compete for the highest score. The game supports keyboard, mouse, and touch controls, with music, reset functionality, and debug mode.

---

## Live Demo

- **Frontend**: [Deployed on Vercel](https://multiplayer-mini-game-3kckl1ah2.vercel.app/)
- **Backend**: [Deployed on Render](https://multiplayer-mini-game-g33p.onrender.com/)

> Open multiple browser windows or devices to test multiplayer mode.

---

## Features

- Real-time multiplayer gameplay
- Coin collection with visual and audio feedback
- Collision detection (more generous on mobile)
- Keyboard (W/A/S/D, Arrow Keys), mouse, and touch input support
- Background music with play/pause
- Game reset functionality
- Debug mode for scale and container info
- Responsive design for desktop and mobile
- Animations for players and coins

---

## Local Development

1. **Clone the repository**:

```bash
git clone https://github.com/yourusername/multiplayer-mini-game.git
cd multiplayer-mini-game
```

2. **Install dependencies**:

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

3. **Start the server**:

```bash
cd ../server
npm start
```

> By default, the server listens on port `3001`.

4. **Start the client**:

```bash
cd ../client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## How to Play

1. Enter your player name and click **Join** to enter the main lobby.
2. Move your player using **Arrow Keys**, **W/A/S/D**, or **mouse/touch drag**.
3. Collect coins to increase your score.
4. First to reach 50 coins wins the game.
5. Press **[0]** to toggle debug mode.

---

## Technologies Used

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Node.js, Express, Socket.IO
- **Deployment**: Vercel (frontend), Render (backend)
- **Audio & Effects**: HTML5 Audio API, CSS animations
