import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

export default function useSocket(SERVER, setPlayers, setIsJoined) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [gameId, setGameId] = useState("main");

  useEffect(() => {
    // Connect to the Socket.IO server
    const s = io(SERVER, { transports: ["websocket"] });
    setSocket(s);

    // Connection established
    s.on("connect", () => setConnected(true));

    // Handle disconnection
    s.on("disconnect", () => {
      setConnected(false);
      setIsJoined(false);
      setPlayers([]);
      toast.error("Disconnected from server");
    });

    // Update player list (initial or ongoing updates)
    s.on("player-list", (data) => setPlayers(data.players || []));
    s.on("players-update", (list) => setPlayers(list));

    // Successfully joined a game room
    s.on("joined", ({ gameId, players }) => {
      setIsJoined(true);
      setPlayers(players || []);
      setGameId(gameId);
      toast.success(`Joined game ${gameId}`, { id: "join-toast" });
    });

    // Successfully left the game room
    s.on("left", () => {
      setIsJoined(false);
      setPlayers([]);
      setGameId("main");
      toast("You left the game", { icon: "👋", id: "leave-toast" });
    });

    // Handle server-side errors
    s.on("error", ({ message }) => {
      toast.error(message || "Server error", { id: "error-toast" });
    });

    // Clean up on component unmount
    return () => {
      s.disconnect();
    };
  }, [SERVER, setPlayers, setIsJoined]);

  // Return socket instance and related state
  return { socket, connected, gameId, setGameId };
}
