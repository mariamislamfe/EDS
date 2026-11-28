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
        "sticky top-0 z-50 transition-[transform,background-color,border-color,box-shadow] duration-500 ease-[var(--ease-out-soft)] will-change-transform",
        hidden && "-translate-y-full",
        // never a solid bar: over the home hero it is bare white ink; elsewhere the
        // logo, nav and actions float as glass capsules over whatever is behind
        pathname === "/" && !scrolled ? "hdr-over" : "hdr-float",
      )}
    >
      {children}
    </header>
  );
}
