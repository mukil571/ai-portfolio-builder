/**
 * Test stand-in for next/font/google (the real loader only runs inside Next's compiler).
 * Each font returns the CSS variable name it was given, like the real one.
 */
type Options = { variable?: string };
const font = (o: Options = {}) => ({
  className: "font",
  variable: o.variable ?? "",
  style: { fontFamily: "test" },
});

export const Inter = font;
export const Space_Grotesk = font;
export const Fraunces = font;
export const Playfair_Display = font;
export const Source_Sans_3 = font;
export const JetBrains_Mono = font;
export const Manrope = font;
export const Geist = font;
export const Geist_Mono = font;
