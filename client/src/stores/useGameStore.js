import create from "zustand";

/**
 * Global game state managed with Zustand.
 * Holds players list and provides setter functions.
 */
const useGameStore = create((set) => ({
  players: [], // List of all players currently in the game
  setPlayers: (players) => set({ players }), // Update the players array
}));

export default useGameStore;
