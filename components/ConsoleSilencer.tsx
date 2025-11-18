"use client";

import { useEffect } from "react";

export default function ConsoleSilencer() {
  useEffect(() => {
    // Only silence logs in production; keep them in development for debugging
    if (process.env.NODE_ENV !== "production") return;
    try {
      const noop = () => {};
      const c = window.console;
      if (!c) return;
      c.log = noop;
      c.info = noop;
      c.debug = noop;
      c.warn = noop;
      // Intentionally keep console.error to surface real errors. If you want to silence errors too, uncomment the next line.
      // c.error = noop;
    } catch {
      // ignore
    }
  }, []);

  return null;
}
