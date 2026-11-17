/**
 * localStorage key for a visitor's light/dark choice on published sites.
 * Lives in a plain module (not "use client") so server components get the real
 * string; exports of client modules are client references on the server.
 */
export const SITE_MODE_KEY = "loriyum-site-mode";
