"use client";

import { useEffect, useState } from "react";

type ThemeMode = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    const current = (document.documentElement.dataset.theme as ThemeMode | undefined) || "dark";
    setTheme(current);
  }, []);

  function toggleTheme() {
    const next: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("naviseerr-theme", next);
  }

  return (
    <button className="ghost-button theme-toggle" onClick={toggleTheme} type="button">
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
