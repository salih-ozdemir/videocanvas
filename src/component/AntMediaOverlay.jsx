import React, { useEffect, useMemo, useRef, useState } from "react";
import { WebPlayer } from "@antmedia/web_player";
// Yardımcılar
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
function computeFitParams(containerW, containerH, videoW, videoH, fit = "cover") {
  if (!containerW || !containerH || !videoW || !videoH) {
    return { scale: 1, offsetX: 0, offsetY: 0, displayW: containerW || 0, displayH: containerH || 0 };
  }
  const scale =
    fit === "contain"
      ? Math.min(containerW / videoW, containerH / videoH)
      : Math.max(containerW / videoW, containerH / videoH);
  const displayW = videoW * scale;
  const displayH = videoH * scale;
  const offsetX = (containerW - displayW) / 2;
  const offsetY = (containerH - displayH) / 2;
  return { scale, offsetX, offsetY, displayW, displayH };
}
export default function AntMediaOverlaySibling({
  httpBaseURL,              // Ör: "https://your-antmedia:5443/WebRTCAppEE"
  streamId,                 // Ör: "teststream"
  token,                    // Opsiyonel
  playOrder = ["webrtc", "hls", "dash"],
  autoplay = true,
  muted = true,
  // Overlay ayarları
  maxRect = 500,            // Ekran pikselinde maksimum dikdörtgen boyutu
  fit = "cover",            // "cover" ekranı doldurur (kırpma olabilir), "contain" kırpma yok
  startEnabled = false,
  // Boyutlandırma
  wrapperStyle = { width: "100%", height: "60vh" }, // Tam ekran isterse: height:"100vh"
}) {
  // DOM referansları
  const wrapperRef = useRef(null);  // Üst wrapper (relative)
  const hostRef = useRef(null);     // Ant Media'nın videoContainer'ı (player bunu yönetir)
  const placeRef = useRef(null);    // Placeholder (player'a verilir)
  const canvasRef = useRef(null);   // Overlay canvas
  const playerRef = useRef(null);
  const videoElRef = useRef(null);  // Gerçek <video> elementi
  // Durumlar
  const [enabled, setEnabled] = useState(startEnabled);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const videoSizeRef = useRef({ w: 1920, h: 1080 }); // metadata geldikçe güncellenir
  const [lastLog, setLastLog] = useState(null);
  // Çizim state'leri (ref ile tutuluyor)
  const isDrawingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const rectRef = useRef(null);
  // Ant Media Web Player'ı başlat
  useEffect(() => {
    if (!hostRef.current) return;
    // video elementine id veriyoruz ve pointer-events:none + object-fit ekliyoruz
    const videoHTMLContent = `
      <video id="ant-video"
        class="video-js vjs-default-skin vjs-big-play-centered"
        ${autoplay ? "autoplay" : ""}
        ${muted ? "muted" : ""}
        controls playsinline
        style="width:100%;height:100%;object-fit:${fit};pointer-events:none"
      ></video>
    `;
    playerRef.current = new WebPlayer(
      {
        streamId,
        httpBaseURL,
        token,
        playOrder,
        videoHTMLContent,
        autoplay,
        mute: muted,
      },
      hostRef.current,
      placeRef.current
    );
    playerRef.current
      .initialize()
      .then(() => playerRef.current?.play())
      .catch((err) => console.error("Ant Media WebPlayer init error:", err));
    return () => {
      // Kütüphanenin resmi destroy API'si dökümanda yok; referansı bırakıyoruz.
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [httpBaseURL, streamId, token, fit, autoplay, muted]);
  // Ant Media host içine video enjekte edildiğinde <video> elementini bul ve metadata yakala
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const tryAttach = (v) => {
      if (!v) return;
      videoElRef.current = v;
      const updateSize = () => {
        const w = v.videoWidth || 1920;
        const h = v.videoHeight || 1080;
        videoSizeRef.current = { w, h };
      };
      v.addEventListener("loadedmetadata", updateSize);
      if (v.readyState >= 1) updateSize();
      // Bazı durumlarda video boyutları stream esnasında değişebilir
      const onResize = () => updateSize();
      v.addEventListener("resize", onResize);
      return () => {
        v.removeEventListener("loadedmetadata", updateSize);
        v.removeEventListener("resize", onResize);
      };
    };
    // Mevcutsa hemen bağlan
    let cleanup = null;
    let v = host.querySelector("#ant-video") || host.querySelector("video");
    if (v) cleanup = tryAttach(v);
    // Sonradan eklenirse MutationObserver ile yakala
    const mo = new MutationObserver(() => {
      if (!videoElRef.current) {
        const found = host.querySelector("#ant-video") || host.querySelector("video");
        if (found) cleanup = tryAttach(found);
      }
    });
    mo.observe(host, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      if (cleanup) cleanup();
    };
  }, []);
  // Wrapper boyutları ve canvas DPR ölçeği
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;
    const resize = () => {
      const r = wrapper.getBoundingClientRect();
      setContainerSize({ w: r.width, h: r.height });
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawCanvas();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrapper);
    resize();
    return () => ro.disconnect();
  }, []);
  // Fit parametreleri
  const fitParams = useMemo(() => {
    return computeFitParams(
      containerSize.w,
      containerSize.h,
      videoSizeRef.current.w,
      videoSizeRef.current.h,
      fit
    );
  }, [containerSize, fit]);
  // Ekran (container) -> Video piksel dönüşümü
  const containerToVideo = (cx, cy) => {
    const { scale, offsetX, offsetY } = fitParams;
    const vx = (cx - offsetX) / (scale || 1);
    const vy = (cy - offsetY) / (scale || 1);
    return {
      x: clamp(vx, 0, videoSizeRef.current.w),
      y: clamp(vy, 0, videoSizeRef.current.h),
    };
  };
  // Çizim fonksiyonları
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    const rect = rectRef.current;
    if (rect) {
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      // Merkez noktası
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      ctx.setLineDash([]);
      ctx.fillStyle = "#22d3ee";
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
      // Boyut etiketi (ekran px)
      const label = `${Math.round(rect.w)}×${Math.round(rect.h)} px (screen)`;
      const pad = 6;
      ctx.font = "12px sans-serif";
      const tw = ctx.measureText(label).width;
      const labelX = rect.x;
      const labelY = Math.max(14, rect.y - 8);
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(labelX, labelY - 14, tw + pad * 2, 18);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, labelX + pad, labelY);
    }
  };
  const clampRectToBounds = (x0, y0, w, h, boundW, boundH) => {
    const limitedW = Math.min(Math.abs(w), maxRect);
    const limitedH = Math.min(Math.abs(h), maxRect);
    let left = w < 0 ? x0 - limitedW : x0;
    let top = h < 0 ? y0 - limitedH : y0;
    left = Math.max(0, Math.min(left, boundW));
    top = Math.max(0, Math.min(top, boundH));
    const width = Math.min(limitedW, boundW - left);
    const height = Math.min(limitedH, boundH - top);
    return { x: left, y: top, w: width, h: height };
  };
  const logJson = ({ w, h, cx, cy }) => {
    const centerVideo = containerToVideo(cx, cy);
    const { scale } = fitParams;
    const widthVideo = Math.round((w || 0) / (scale || 1));
    const heightVideo = Math.round((h || 0) / (scale || 1));
    const payload = {
      width: widthVideo,
      height: heightVideo,
      column: Math.round(centerVideo.x),
      row: Math.round(centerVideo.y),
    };
    console.log(JSON.stringify(payload));
    setLastLog(payload);
  };
  // Mouse olayları
  const onMouseDown = (e) => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    isDrawingRef.current = true;
    startRef.current = { x, y };
    rectRef.current = { x, y, w: 0, h: 0 };
    drawCanvas();
    // İlk tıklamada JSON (width=0,height=0; merkez tıklanan nokta)
    logJson({ w: 0, h: 0, cx: x, cy: y });
  };
  const onMouseMove = (e) => {
    if (!enabled || !isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const s = startRef.current;
    const rawW = x - s.x;
    const rawH = y - s.y;
    rectRef.current = clampRectToBounds(s.x, s.y, rawW, rawH, r.width, r.height);
    drawCanvas();
  };
  const finalize = () => {
    const rect = rectRef.current;
    if (rect) {
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      logJson({ w: rect.w, h: rect.h, cx, cy });
    }
  };
  const onMouseUp = () => {
    if (!enabled || !isDrawingRef.current) return;
    isDrawingRef.current = false;
    drawCanvas();
    finalize();
  };
  const onMouseLeave = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      drawCanvas();
      finalize();
    }
  };
  const toggle = () => {
    setEnabled((prev) => {
      const next = !prev;
      if (!next) {
        rectRef.current = null;
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx && canvasRef.current) {
          ctx.clearRect(0, 0, canvasRef.current.clientWidth, canvasRef.current.clientHeight);
        }
        setLastLog(null);
      }
      return next;
    });
  };
  return (
    <div>
      {/* Kontroller */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <button
          onClick={toggle}
          style={{
            padding: "8px 12px",
            background: enabled ? "#0ea5e9" : "#334155",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {enabled ? "Çizimi Kapat ve Temizle" : "Çizimi Aç"}
        </button>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          {enabled ? "Mouse ile dikdörtgen çizin (maks 500×500 px)." : "Çizim devre dışı."}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>
          fit: {fit} · video: {videoSizeRef.current.w}×{videoSizeRef.current.h}px
        </span>
      </div>
      {/* Wrapper: Kardeş katman yapısı */}
      <div
        ref={wrapperRef}
        style={{
          position: "relative",
          background: "#000",
          borderRadius: 8,
          overflow: "hidden",
          userSelect: "none",
          ...wrapperStyle,
        }}
      >
        {/* HOST: Ant Media player buraya video ekler, çocukları değiştirebilir */}
        <div
          ref={hostRef}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
          }}
        />
        {/* PLACEHOLDER: Player'a parametre olarak geçilir */}
        <div
          ref={placeRef}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#cbd5e1",
            background: "#0b1220",
          }}
        >
          Yayın kısa süre içinde başlayacak…
        </div>
        {/* OVERLAY: Kardeş ve en üstte; player DOM değişikliklerinden etkilenmez */}
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            cursor: enabled ? "crosshair" : "default",
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
        />
      </div>
      {/* Opsiyonel: Son logu göster */}
      {lastLog && (
        <pre
          style={{
            marginTop: 12,
            background: "#0b1220",
            color: "#e2e8f0",
            padding: 12,
            borderRadius: 8,
          }}
        >
{JSON.stringify(lastLog, null, 2)}
        </pre>
      )}
    </div>
  );
}