'use client';

import { Actress } from '@prisma/client';
import React, { createContext, useContext, useState } from 'react';

interface ConsoleContextType {
  isFormOpen: boolean;
  setIsFormOpen: (isOpen: boolean) => void;
  isBatchFormOpen: boolean;
  setIsBatchFormOpen: (isOpen: boolean) => void;
  selectedActress: Actress | undefined;
  setSelectedActress: (actress: Actress | undefined) => void;
}

const ConsoleContext = createContext<ConsoleContextType | undefined>(undefined);

export const useConsole = () => {
  const context = useContext(ConsoleContext);
  if (!context) {
    throw new Error('useConsole must be used within a ConsoleProvider');
  }
  return context;
};

export default function ConsoleState({ children }: { children: React.ReactNode }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBatchFormOpen, setIsBatchFormOpen] = useState(false);
  const [selectedActress, setSelectedActress] = useState<Actress | undefined>(undefined);

  return (
    <ConsoleContext.Provider value={{ 
      isFormOpen, 
      setIsFormOpen, 
      isBatchFormOpen, 
      setIsBatchFormOpen,
      selectedActress, 
      setSelectedActress 
    }}>
      {children}
    </ConsoleContext.Provider>
  );
}
