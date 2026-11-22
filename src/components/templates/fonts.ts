import {
  Fraunces,
  Inter,
  JetBrains_Mono,
  Manrope,
  Playfair_Display,
  Source_Sans_3,
  Space_Grotesk,
} from "next/font/google";

/*
 * Site template fonts. Geist comes from the root layout. These are declared with
 * preload:false: the browser only downloads a face when a site actually uses it, so a
 * page never pays for the pairs it doesn't render. font-display: swap keeps text visible.
 */
// next/font needs literal options in every call (it is compiled at build time).
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-inter",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-space-grotesk",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-fraunces",
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-playfair",
});
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-source-sans",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-jetbrains",
});
const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-manrope",
});

/** Class names that define every template font variable (apply on the site root). */
export const siteFontVariables = [
  inter,
  spaceGrotesk,
  fraunces,
  playfair,
  sourceSans,
  jetbrains,
  manrope,
]
  .map((f) => f.variable)
  .join(" ");
