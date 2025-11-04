import { describe, it, expect } from 'vitest';
import useGameStore from './useGameStore';

describe('useGameStore', () => {
  it('initializes with empty players and can set players', () => {
    const { getState, setState } = useGameStore;
    // ensure clean
    setState({ players: [] });
    expect(getState().players).toEqual([]);

    const sample = [{ id: '1', name: 'A' }];
    getState().setPlayers(sample);
    expect(getState().players).toEqual(sample);
  });
});
