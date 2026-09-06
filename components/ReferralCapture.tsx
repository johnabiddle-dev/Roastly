"use client";

import { useEffect } from "react";
import { getBrowserId } from "@/lib/client";

export default function ReferralCapture() {
  useEffect(() => {
    try {
      const ref = new URL(window.location.href).searchParams.get("ref");
      if (!ref) return;
      if (ref !== getBrowserId()) localStorage.setItem("roastly-referrer", ref);
    } catch {
      // ignore malformed URLs
    }
  }, []);
  return null;
}
