import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define a interface para o contexto do tema
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

// Cria o contexto do tema com um valor padrão (que será sobrescrito pelo provedor)
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Hook personalizado para usar o tema
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Componente provedor do tema
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Inicializa o tema lendo do localStorage ou detectando a preferência do sistema
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      return storedTheme as 'light' | 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Efeito para aplicar a classe 'dark' ao elemento <html> e salvar no localStorage
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'dark' ? 'light' : 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};