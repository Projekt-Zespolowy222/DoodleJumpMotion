import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Difficulty = 'easy' | 'medium' | 'hard';

type GameSettingsContextValue = {
  difficulty: Difficulty;
  setDifficulty: (difficulty: Difficulty) => void;
};

const GameSettingsContext = createContext<GameSettingsContextValue | undefined>(
  undefined
);

type GameSettingsProviderProps = {
  children: ReactNode;
};

export const GameSettingsProvider: React.FC<GameSettingsProviderProps> = ({
  children,
}) => {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  return (
    <GameSettingsContext.Provider value={{ difficulty, setDifficulty }}>
      {children}
    </GameSettingsContext.Provider>
  );
};

export const useGameSettings = (): GameSettingsContextValue => {
  const ctx = useContext(GameSettingsContext);
  if (!ctx) {
    throw new Error('useGameSettings must be used within GameSettingsProvider');
  }
  return ctx;
};
