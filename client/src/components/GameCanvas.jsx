import React, { useEffect, useRef, useState } from "react";
import useGameStore from "../stores/useGameStore";
import toast from "react-hot-toast";

/**
 * GameCanvas
 * Renders players, coins, collisions, handles input & socket events, music, and scaling.
 */
export default function GameCanvas({ socket, gameId }) {
  const { players } = useGameStore();

  // State
  const [coins, setCoins] = useState([]);
  const [collisions, setCollisions] = useState([]);
  const [collectedCoins, setCollectedCoins] = useState([]);
  const [myPlayer, setMyPlayer] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [scale, setScale] = useState(1);
  const [containerSize, setContainerSize] = useState({ w: 760, h: 420 });
  const [musicPlaying, setMusicPlaying] = useState(true);

  // Refs
  const containerRef = useRef(null);
  const myPlayerRef = useRef(null);
  const coinsRef = useRef([]);
  const bgMusicRef = useRef(null);

  // Constants
  const MAP_WIDTH = 760;
  const MAP_HEIGHT = 420;
  const RADIUS = 12;
  const WINNING_SCORE = 50;

  // Collision margin (more generous on mobile)
  const COLLISION_MARGIN = window.innerWidth < 768 ? 28 : 10; // increased for mobile

  // Derived values
  const toPx = (coord) => coord * scale;
  const radiusPx = Math.max(1, RADIUS * scale);

  // Sync Refs
  useEffect(() => {
    myPlayerRef.current = myPlayer;
  }, [myPlayer]);
  useEffect(() => {
    coinsRef.current = coins;
  }, [coins]);

  // Background music
  useEffect(() => {
    if (!bgMusicRef.current) {
      bgMusicRef.current = new Audio("/music/background.mp3");
      bgMusicRef.current.loop = true;
      bgMusicRef.current.volume = 0.25;
      bgMusicRef.current.play().catch(() => {});
    } else if (musicPlaying && document.hasFocus()) {
      bgMusicRef.current.play().catch(() => {});
    } else {
      bgMusicRef.current.pause();
    }

    const handleVisibilityChange = () => {
      if (document.hidden) bgMusicRef.current?.pause();
      else if (musicPlaying) bgMusicRef.current?.play().catch(() => {});
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      bgMusicRef.current?.pause();
      if (bgMusicRef.current) bgMusicRef.current.currentTime = 0;
    };
  }, [musicPlaying]);

  // Keyboard input
  useEffect(() => {
    if (!socket?.connected) return;
    const keyMap = {
      w: "up",
      a: "left",
      s: "down",
      d: "right",
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
    };

    const handleKeyDown = (e) => {
      if (keyMap[e.key]) socket.emit("move", keyMap[e.key]);
      if (e.key === "0") {
        setShowDebug((prev) => !prev);
        setShowHint(true);
        setTimeout(() => setShowHint(false), 4000);
      }
    };
    const handleKeyUp = (e) =>
      keyMap[e.key] && socket.emit("stop", keyMap[e.key]);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [socket?.connected]);

  // Socket events
  useEffect(() => {
    if (!socket?.connected) return;

    const victorySound = new Audio("/music/victory.mp3");
    const defeatSound = new Audio("/music/defeat.mp3");
    const resetSound = new Audio("/music/reset.mp3");
    victorySound.volume = 0.5;
    defeatSound.volume = 0.5;
    resetSound.volume = 0.5;

    const handleCollision = (pair) => {
      setCollisions((prev) => [...prev, pair]);
      setTimeout(
        () => setCollisions((prev) => prev.filter((p) => p !== pair)),
        500
      );
    };
    const handleCoinsUpdate = setCoins;
    const handlePlayersUpdate = (players) => {
      const me = players.find((p) => p.id === socket.id);
      if (me) setMyPlayer(me);
    };
    const handleGameOver = ({ winner, winnerId }) => {
      const msg =
        winnerId === socket.id
          ? `😁 You won with ${WINNING_SCORE} coins!`
          : `😖 ${winner} reached ${WINNING_SCORE} coins first.`;

      if (winnerId === socket.id)
        toast.success(msg), victorySound.play().catch(() => {});
      else toast.error(msg), defeatSound.play().catch(() => {});
    };
    const handleReset = () => {
      toast("🔄 Game has been reset");
      const sound = resetSound.cloneNode();
      sound.volume = resetSound.volume;
      sound.play().catch(() => {});
    };

    socket.on("collision", handleCollision);
    socket.on("coins-update", handleCoinsUpdate);
    socket.on("players-update", handlePlayersUpdate);
    socket.on("game-over", handleGameOver);
    socket.on("game-reset", handleReset);

    return () => {
      socket.off("collision", handleCollision);
      socket.off("coins-update", handleCoinsUpdate);
      socket.off("players-update", handlePlayersUpdate);
      socket.off("game-over", handleGameOver);
      socket.off("game-reset", handleReset);
    };
  }, [socket?.connected]);

  // Scaling
  useEffect(() => {
    const updateSize = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setScale(Math.min(rect.width / MAP_WIDTH, rect.height / MAP_HEIGHT));
      setContainerSize({ w: rect.width, h: rect.height });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      window.removeEventListener("resize", updateSize);
      observer.disconnect();
    };
  }, []);

  // Coin collection (mobile-friendly collisions)
  useEffect(() => {
    if (!socket?.connected) return;

    const coinSound = new Audio("/music/coin.mp3");
    coinSound.volume = 0.35;
    coinSound.preload = "auto";

    const playCoinSound = () => {
      if (!document.hasFocus()) return;
      const sound = coinSound.cloneNode();
      sound.volume = coinSound.volume;
      sound.play().catch(() => {});
    };

    const interval = setInterval(() => {
      const player = myPlayerRef.current;
      if (!player) return;

      coinsRef.current.forEach((c) => {
        const dx = player.x - c.x;
        const dy = player.y - c.y;
        if (Math.sqrt(dx * dx + dy * dy) < radiusPx + COLLISION_MARGIN) {
          socket.emit("collect", { coinId: c.id });
          setCollectedCoins((prev) => [...prev, c.id]);
          playCoinSound();
          setTimeout(
            () => setCollectedCoins((prev) => prev.filter((id) => id !== c.id)),
            400
          );
        }
      });
    }, 80);

    return () => clearInterval(interval);
  }, [socket?.connected, radiusPx, COLLISION_MARGIN]);

  // Mouse & touch input (prevent scroll only while dragging)
  useEffect(() => {
    if (!socket?.connected || !containerRef.current) return;

    const el = containerRef.current;
    let isDragging = false;

    const getCoords = (e) => {
      const rect = el.getBoundingClientRect();
      if (e.touches && e.touches[0])
        return {
          x: (e.touches[0].clientX - rect.left) / scale,
          y: (e.touches[0].clientY - rect.top) / scale,
        };
      return {
        x: (e.clientX - rect.left) / scale,
        y: (e.clientY - rect.top) / scale,
      };
    };

    // Mouse handlers
    const handleMouseDown = (e) => {
      e.preventDefault();
      isDragging = true;
      socket.emit("mouse-down", getCoords(e));
    };
    const handleMouseMove = (e) => {
      e.preventDefault();
      if (isDragging) socket.emit("mouse-move", getCoords(e));
    };
    const handleMouseUp = () => {
      isDragging = false;
      socket.emit("mouse-up");
    };

    // Touch handlers
    const handleTouchStart = (e) => {
      isDragging = true;
      socket.emit("mouse-down", getCoords(e));
    };
    const handleTouchMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      socket.emit("mouse-move", getCoords(e));
    };
    const handleTouchEnd = () => {
      isDragging = false;
      socket.emit("mouse-up");
    };

    // Add events
    el.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      el.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      el.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [socket?.connected, scale]);

  // Hide hint timer
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Render
  return (
    <div
      className="rounded-lg shadow-lg overflow-hidden border"
      style={{ backgroundColor: "var(--panel-bg)" }}
      role="region"
      aria-label="Game canvas"
    >
      {/* Header */}
      <div className="p-3 border-b bg-white/5 flex flex-col md:flex-row items-center justify-between gap-2">
        <div className="text-sm font-medium flex items-center gap-3">
          Room: <span className="font-mono">{gameId}</span>
          <button
            onClick={() => socket?.emit("reset-game")}
            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={() => setMusicPlaying((prev) => !prev)}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            {musicPlaying ? "Pause Music" : "Play Music"}
          </button>
        </div>
        <div className="text-xs text-gray-400">
          Use <span className="font-mono">Arrow Keys</span>,{" "}
          <span className="font-mono">W/A/S/D</span> or your{" "}
          <span className="font-mono">Mouse</span> to move
        </div>
      </div>

      {/* Game Container */}
      <div className="p-6 flex justify-center">
        <div
          ref={containerRef}
          className="relative rounded-md overflow-hidden select-none"
          style={{
            width: MAP_WIDTH,
            height: MAP_HEIGHT,
            background: "linear-gradient(180deg,#0b1220,#0f1724)",
            boxShadow: "inset 0 2px 8px rgba(0,0,0,0.6)",
          }}
        >
          {/* Players */}
          {players.map((p) => {
            const isMe = socket?.id === p.id;
            const hit = collisions.some((pair) => pair.includes(p.id));
            const leftPx = toPx(p.x);
            const topPx = toPx(p.y);
            const clampedLeft = Math.min(
              containerSize.w - radiusPx,
              Math.max(radiusPx, leftPx)
            );
            const clampedTop = Math.min(
              containerSize.h - radiusPx,
              Math.max(radiusPx, topPx)
            );
            const sizePx = radiusPx * 2;

            return (
              <div
                key={p.id}
                style={{
                  position: "absolute",
                  left: clampedLeft,
                  top: clampedTop,
                  width: sizePx,
                  height: sizePx,
                  transform: `translate(-${radiusPx}px,-${radiusPx}px)`,
                  pointerEvents: "none",
                  transition: "left 0.1s linear, top 0.1s linear",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    bottom: "-4px",
                    left: "50%",
                    width: sizePx * 0.8,
                    height: sizePx * 0.25,
                    background: "rgba(0,0,0,0.25)",
                    borderRadius: "50%",
                    transform: "translateX(-50%)",
                    filter: "blur(2px)",
                    zIndex: 0,
                  }}
                />
                <div
                  className={`rounded-full border transition-all duration-150 ${
                    hit ? "animate-bounce ring-4 ring-red-500/50" : ""
                  }`}
                  style={{
                    width: "100%",
                    height: "100%",
                    background: isMe
                      ? "radial-gradient(circle at 30% 30%, #00d4ff, #0f1724)"
                      : "radial-gradient(circle at 30% 30%, #ff7f50, #0f1724)",
                    boxShadow: isMe
                      ? "0 0 12px 3px rgba(0, 212, 255, 0.7), inset 0 2px 4px rgba(0,0,0,0.3)"
                      : "0 0 6px rgba(255,127,80,0.5), inset 0 1px 3px rgba(0,0,0,0.3)",
                    animation: "float 1.2s ease-in-out infinite alternate",
                    zIndex: 1,
                  }}
                />
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-white text-xs font-semibold whitespace-nowrap">
                  {p.name} ({p.score || 0})
                </div>
              </div>
            );
          })}

          {/* Coins */}
          {coins.map((c) => {
            const isCollected = collectedCoins.includes(c.id);
            return (
              <div
                key={c.id}
                style={{
                  position: "absolute",
                  left: toPx(c.x),
                  top: toPx(c.y),
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle at 30% 30%, gold, orange)",
                    boxShadow: "0 0 10px gold, 0 0 20px rgba(255,215,0,0.7)",
                    transform: "translate(-10px,-10px)",
                    animation: isCollected
                      ? "collect 0.5s forwards ease-out"
                      : "pulse 1.2s infinite alternate",
                    filter: isCollected ? "blur(1px)" : "none",
                    position: "relative",
                    zIndex: 2,
                  }}
                />
                {isCollected && (
                  <div
                    style={{
                      position: "absolute",
                      left: "-5px",
                      top: "-5px",
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background:
                        "radial-gradient(circle, rgba(255,255,200,0.8), rgba(255,255,200,0) 70%)",
                      animation: "sparkle 0.4s forwards ease-out",
                      zIndex: 1,
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* Debug Info */}
          {showDebug && (
            <div className="absolute right-2 bottom-2 z-50 text-xs bg-black/50 text-white px-2 py-1 rounded">
              <div>scale: {scale.toFixed(3)}</div>
              <div>
                container: {Math.round(containerSize.w)}×
                {Math.round(containerSize.h)}
              </div>
              <div>radiusPx: {radiusPx.toFixed(1)}</div>
            </div>
          )}

          {/* Hint */}
          <div
            className={`absolute left-2 bottom-2 z-40 flex items-center gap-2 text-xs px-2 py-1 rounded-md transition-opacity duration-700 ${
              showHint ? "opacity-100" : "opacity-0"
            } ${showDebug ? "text-green-400" : "text-gray-400"} bg-black/40`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                showDebug ? "bg-green-400" : "bg-gray-400"
              }`}
            />
            <span>Press [0] for debug</span>
          </div>

          {/* Animations */}
          <style>{`
            @keyframes float { 0% { transform: translateY(0); } 100% { transform: translateY(-4px); } }
            @keyframes pulse { 0% { transform: translate(-10px,-10px) scale(1); } 100% { transform: translate(-10px,-10px) scale(1.1); } }
            @keyframes collect { 0% { transform: translate(-10px,-10px) scale(1); opacity:1 } 100% { transform: translate(-10px,-20px) scale(0.5); opacity:0 } }
            @keyframes sparkle { 0% { transform: scale(1); opacity:0.8 } 100% { transform: scale(1.5); opacity:0 } }
          `}</style>
        </div>
      </div>
    </div>
  );
}
