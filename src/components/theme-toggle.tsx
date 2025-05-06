"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Initializing theme based on local storage or system preference
  useEffect(() => {
    // This wallet is designed for dark mode, so we'll keep it dark
    setIsDarkMode(true);
    document.documentElement.classList.add("dark");
  }, []);

  // Just a placeholder function since we're keeping the wallet in dark mode
  const toggleTheme = () => {
    // We won't actually toggle the theme
    // This is just a placeholder button for the UI
    return;
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md text-gray-400 bg-gray-900/30 border border-zinc-800"
      aria-label="Toggle theme"
    >
      {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
