import React, { createContext, useContext, useState } from "react";

interface PoseContextType {
  torsoCoords: { x: number; y: number };
  setTorsoCoords: (coords: { x: number; y: number }) => void;
  isJumping: boolean;
  setIsJumping: (jumping: boolean) => void;
}

const PoseContext = createContext<PoseContextType | undefined>(undefined);

export const PoseProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [torsoCoords, setTorsoCoords] = useState({ x: 0, y: 0 });
  const [isJumping, setIsJumping] = useState(false);

  return (
    <PoseContext.Provider
      value={{ torsoCoords, setTorsoCoords, isJumping, setIsJumping }}
    >
      {children}
    </PoseContext.Provider>
  );
};

export const usePose = () => {
  const context = useContext(PoseContext);
  if (context === undefined) {
    throw new Error("usePose must be used within a PoseProvider");
  }
  return context;
};
