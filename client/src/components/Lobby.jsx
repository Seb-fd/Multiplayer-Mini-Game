import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function Lobby({
  socket,
  gameId,
  setGameId,
  isJoined,
  setIsJoined,
}) {
  const [name, setName] = useState(
    `Player-${Math.floor(Math.random() * 1000)}`
  );
  const [isLoading, setIsLoading] = useState(false);

  // Listen for server events
  useEffect(() => {
    if (!socket) return;

    const handleJoinError = ({ message }) => {
      setIsLoading(false);
      toast.error(message || "Cannot join the room");
    };

    const handleJoined = ({ gameId }) => {
      setIsJoined(true);
      setGameId(gameId);
      setIsLoading(false);
    };

    socket.on("join-error", handleJoinError);
    socket.on("joined", handleJoined);

    return () => {
      socket.off("join-error", handleJoinError);
      socket.off("joined", handleJoined);
    };
  }, [socket]);

  const handleJoin = () => {
    if (!socket) return toast.error("Socket not connected");
    if (!name.trim()) return toast.error("Enter a name first");

    const roomId = gameId.trim() || "main"; // Default room if none provided
    setIsLoading(true);
    socket.emit("join-game", { gameId: roomId, name });
  };

  const handleLeave = () => {
    if (!socket) return;
    setIsLoading(true);

    socket.emit("leave-game", { gameId });
    setTimeout(() => {
      setIsJoined(false);
      setIsLoading(false);
    }, 200);
  };

  return (
    <div className="flex flex-col gap-4 p-6 bg-[var(--panel-bg)] border border-gray-700 rounded-xl shadow-md max-w-md mx-auto select-none">
      <h2 className="text-xl font-semibold text-center text-white bg-gray-900/70 px-4 py-2 rounded-lg shadow">
        {isJoined ? "Game Lobby" : "Join a Game"}
      </h2>

      <div className="flex flex-col gap-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">
            Player Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isJoined || isLoading}
            placeholder="Player Name"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Room ID</label>
          <input
            type="text"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            disabled={isJoined || isLoading}
            placeholder="Game ID (leave empty to create)"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50"
          />
        </div>
      </div>

      <div className="flex gap-3">
        {!isJoined ? (
          <button
            onClick={handleJoin}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors ${
              isLoading
                ? "bg-sky-800 cursor-not-allowed"
                : "bg-sky-600 hover:bg-sky-700"
            }`}
          >
            {isLoading ? "Joining..." : "Join"}
          </button>
        ) : (
          <button
            onClick={handleLeave}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors ${
              isLoading
                ? "bg-gray-700 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isLoading ? "Leaving..." : "Leave"}
          </button>
        )}
      </div>

      {!isJoined && (
        <p className="text-xs text-gray-500 text-center mt-2">
          💡 Tip: open another tab to test multiplayer.
        </p>
      )}
    </div>
  );
}
