"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Sticky bar that hides while scrolling down and returns on scroll up. */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled((v) => (v === y > 8 ? v : y > 8));
      if (Math.abs(y - last) > 6) {
        setHidden(y > last && y > 240);
        last = y;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[transform,background-color,border-color] duration-500 ease-[var(--ease-out-soft)]",
        hidden && "-translate-y-full",
        scrolled ? "border-b border-line/70 bg-white/90 backdrop-blur-md" : "border-b border-transparent bg-white/0",
      )}
    >
      {children}
    </header>
  );
}
