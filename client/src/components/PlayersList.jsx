import React from "react";
import useGameStore from "../stores/useGameStore";

export default function PlayersList({ socket }) {
  // Access the list of players from the global game store
  const { players } = useGameStore();

  // If there are no players yet, show a simple placeholder message
  if (!players.length) {
    return <p className="text-sm text-gray-500">No players yet</p>;
  }

  return (
    <ul className="space-y-2">
      {players.map((p) => (
        <li key={p.id} className="flex items-center justify-between text-sm">
          {/* Player name and indicator */}
          <div className="flex items-center gap-2">
            {/* Colored dot: highlights the current player's dot */}
            <span
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor:
                  p.id === socket?.id ? "var(--accent)" : "var(--accent-2)",
              }}
            />
            <span className="font-medium">{p.name}</span>
          </div>

          {/* Player coordinates for debug or info display */}
          <div className="text-xs text-gray-500 font-mono">
            x:{Math.round(p.x)} y:{Math.round(p.y)}
          </div>
        </li>
      ))}
    </ul>
  );
}
