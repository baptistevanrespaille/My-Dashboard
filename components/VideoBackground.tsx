"use client";

import { useEffect, useRef } from "react";

const HLS_URL = "https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8";

export default function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hlsInstance: any = null;

    async function init() {
      try {
        const Hls = (await import("hls.js")).default;

        if (Hls.isSupported() && video) {
          hlsInstance = new Hls({
            enableWorker: false,
            lowLatencyMode: false,
            backBufferLength: 30,
          });
          hlsInstance.loadSource(HLS_URL);
          hlsInstance.attachMedia(video);
          hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            video?.play().catch(() => {
              // Autoplay blocked — silent fail
            });
          });
        } else if (video?.canPlayType("application/vnd.apple.mpegurl")) {
          // Safari native HLS
          if (video) { video.src = HLS_URL; video.play().catch(() => {}); }
        }
      } catch {
        // HLS not available — black background remains
      }
    }

    init();

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
      }
    };
  }, []);

  return (
    <>
      {/* Layer 0: Video */}
      <video
        ref={videoRef}
        aria-hidden
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -3,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          pointerEvents: "none",
        }}
      />

      {/* Layer 1: Main gradient overlay */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -2,
          background: `linear-gradient(
            to bottom,
            rgba(0,0,0,0.78) 0%,
            rgba(0,0,0,0.55) 25%,
            rgba(0,0,0,0.50) 50%,
            rgba(0,0,0,0.62) 75%,
            rgba(0,0,0,0.88) 100%
          )`,
          pointerEvents: "none",
        }}
      />

      {/* Layer 2: Vignette */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -2,
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.72) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Layer 3: Scan line */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
          zIndex: -1,
          pointerEvents: "none",
          animation: "scanLine 6s linear infinite",
          top: "-1px",
        }}
      />
    </>
  );
}
