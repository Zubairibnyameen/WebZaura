import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`} aria-label="WebZaura home">
      <img src="/webzaura-logo.png" alt="" width={28} height={28} className="h-7 w-7 object-contain" />
      <span className="text-[22px] font-semibold leading-none tracking-[-0.02em]">WebZaura</span>
    </Link>
  );
}
