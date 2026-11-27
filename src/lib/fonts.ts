import { Instrument_Sans, Instrument_Serif, JetBrains_Mono, Readex_Pro } from "next/font/google";

export const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
  weight: "400",
  style: ["normal", "italic"],
});

export const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  preload: false, // small labels only; swaps in when ready
  weight: ["400", "500"],
});

/** Fallback for Arabic product names that have no English translation yet. */
export const readex = Readex_Pro({
  subsets: ["arabic"],
  variable: "--font-readex",
  display: "swap",
  preload: false, // only fetched when an Arabic glyph is actually on the page
  weight: ["400", "500", "600"],
});

export const fontVariables = `${instrument.variable} ${instrumentSerif.variable} ${jetbrains.variable} ${readex.variable}`;
