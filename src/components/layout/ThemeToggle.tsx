import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => { const update = () => setDark(document.documentElement.classList.contains("dark")); update(); const observer = new MutationObserver(update); observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] }); return () => observer.disconnect(); }, []);
  const toggle = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    try { localStorage.setItem("wz-theme", isDark ? "dark" : "light"); } catch { /* ignore */ }
  };
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} className="ghost-link grid min-h-11 min-w-11 place-items-center rounded-full text-foreground">
      <svg className="hidden h-[18px] w-[18px] dark:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      <svg className="h-[18px] w-[18px] dark:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    </Button>
  );
}

// Dark by default; light only when the visitor chose it. Runs in <head> before first paint.
export const themeScript = `try{document.documentElement.classList.toggle('dark',localStorage.getItem('wz-theme')!=='light')}catch(e){}`;
