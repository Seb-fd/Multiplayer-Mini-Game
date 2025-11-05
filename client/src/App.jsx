import React, { useState } from "react";
import Lobby from "./components/Lobby";
import GameCanvas from "./components/GameCanvas";
import PlayersList from "./components/PlayersList";
import useGameStore from "./stores/useGameStore";
import useSocket from "./hooks/useSocket";
import { Toaster } from "react-hot-toast";

// Default server URL (can be overridden with an environment variable)
const SERVER =
  import.meta.env.VITE_SERVER_URL ||
  "https://multiplayer-mini-game-g33p.onrender.com/";

export default function App() {
  // Access global game store actions
  const { setPlayers } = useGameStore();

  // Local state to track if the player has joined a game
  const [isJoined, setIsJoined] = useState(false);

  // Initialize the socket connection and related state
  const { socket, connected, gameId, setGameId } = useSocket(
    SERVER,
    setPlayers,
    setIsJoined
  );

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-white via-slate-50 to-slate-100">
      {/* Toast notifications */}
      <Toaster position="top-right" />

      {/* Header section with connection status */}
      <header className="max-w-5xl mx-auto mb-6 px-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-extrabold">
            Multiplayer Mini Game
          </h1>

          <div className="flex flex-wrap items-center gap-3">
            {/* Connection indicator */}
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                connected
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {connected ? "connected" : "disconnected"}
            </div>

            {/* Server info */}
            <div className="text-sm text-gray-600 max-w-full">
              Server: <span className="font-mono break-all">{SERVER}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main layout: game area + sidebar */}
      <main className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Game canvas or placeholder */}
        <section className="md:col-span-2">
          {socket ? (
            isJoined ? (
              <GameCanvas socket={socket} gameId={gameId} />
            ) : (
              <Placeholder text="Join a game from the Lobby to start" />
            )
          ) : (
            <Placeholder text="Connecting to server..." />
          )}
        </section>

        {/* Sidebar: lobby and player list */}
        <aside className="md:col-span-1 space-y-4">
          {/* Lobby controls */}
          <div className="p-4 rounded-lg bg-white shadow-sm border">
            <h2 className="text-lg font-semibold mb-2">Lobby</h2>
            <Lobby
              socket={socket}
              gameId={gameId}
              setGameId={setGameId}
              isJoined={isJoined}
              setIsJoined={setIsJoined}
            />
          </div>

          {/* Only show players list when joined */}
          {isJoined && (
            <div className="p-4 rounded-lg bg-white shadow-sm border">
              <h3 className="text-lg font-semibold mb-2">Players</h3>
              <PlayersList socket={socket} />
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

// Simple placeholder component used when not connected or not in a game
function Placeholder({ text }) {
  return (
    <div className="h-[420px] rounded-lg border border-gray-200 bg-white/60 flex items-center justify-center">
      <span className="text-sm text-gray-500">{text}</span>
    </div>
  );
}
