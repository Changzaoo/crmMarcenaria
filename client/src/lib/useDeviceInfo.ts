import { useEffect, useState } from "react";

export type Orientation = "portrait" | "landscape";

export interface DeviceInfo {
  /** Dispositivo de toque "de mão" (celular/tablet) — controles touch fazem sentido. */
  isMobile: boolean;
  /** Tela sensível ao toque (inclui notebooks com touch). */
  isTouch: boolean;
  orientation: Orientation;
}

function detect(): DeviceInfo {
  if (typeof window === "undefined") {
    return { isMobile: false, isTouch: false, orientation: "landscape" };
  }
  const isTouch = "ontouchstart" in window || (navigator.maxTouchPoints || 0) > 0;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const ua = navigator.userAgent || "";
  const uaMobile = /Android|iPhone|iPad|iPod|Mobile|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua);
  const small = Math.min(window.innerWidth, window.innerHeight) <= 820;
  // Mobile = toque grosseiro (dedo) e (UA de celular OU tela pequena).
  const isMobile = (isTouch && coarse && (uaMobile || small)) || (uaMobile && small);
  const orientation: Orientation = window.innerHeight >= window.innerWidth ? "portrait" : "landscape";
  return { isMobile, isTouch, orientation };
}

// Detecta dispositivo (mobile/PC) e orientação, reagindo a resize/rotação de tela.
export function useDeviceInfo(): DeviceInfo {
  const [info, setInfo] = useState<DeviceInfo>(detect);

  useEffect(() => {
    const update = () => setInfo(detect());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    const mq = window.matchMedia?.("(orientation: portrait)");
    mq?.addEventListener?.("change", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      mq?.removeEventListener?.("change", update);
    };
  }, []);

  return info;
}
