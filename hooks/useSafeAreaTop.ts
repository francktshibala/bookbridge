"use client";

import { useEffect, useMemo, useState } from "react";

function isRunningOniOS(userAgent: string): boolean {
  return /iPad|iPhone|iPod/.test(userAgent) || (navigator as any).platform === "iPad";
}

function isPortraitOrientation(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia && window.matchMedia("(orientation: portrait)").matches;
}

function measureSafeAreaInsetTopPx(): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;

  const probeElement = document.createElement("div");
  probeElement.style.position = "absolute";
  probeElement.style.top = "0";
  probeElement.style.left = "0";
  probeElement.style.zIndex = "-1";
  // Ask the layout engine to resolve env(safe-area-inset-top)
  // Some WebViews resolve only when used as height.
  probeElement.style.height = "env(safe-area-inset-top)";
  // Backwards compat for older iOS Safari syntax
  (probeElement.style as any).height = (probeElement.style as any).height || "constant(safe-area-inset-top)";

  document.body.appendChild(probeElement);
  const computed = window.getComputedStyle(probeElement);
  const measured = parseFloat(computed.height || "0");
  document.body.removeChild(probeElement);
  return Number.isFinite(measured) ? measured : 0;
}

/**
 * useSafeAreaTop
 * - Measures iOS safe area inset top at runtime.
 * - Provides a robust fallback for iOS portrait mode in simulators that may return 0.
 */
export function useSafeAreaTop(): number {
  const [safeAreaTopPx, setSafeAreaTopPx] = useState<number>(0);

  const isIOS = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return isRunningOniOS(navigator.userAgent || "");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const recompute = () => {
      let value = measureSafeAreaInsetTopPx();

      // Heuristic fallback for iOS portrait when simulator returns 0
      if (isIOS && isPortraitOrientation() && (!value || value < 1)) {
        // Use a practical fallback large enough for notched devices
        value = 70; // matches CSS portrait override
      }

      setSafeAreaTopPx(value);
    };

    recompute();
    window.addEventListener("orientationchange", recompute);
    window.addEventListener("resize", recompute);
    return () => {
      window.removeEventListener("orientationchange", recompute);
      window.removeEventListener("resize", recompute);
    };
  }, [isIOS]);

  return safeAreaTopPx;
}


