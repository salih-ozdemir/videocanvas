import React, { useEffect, useRef, useState } from "react";

function VideoRectangleAnnotator({
  src = "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/BBB_1080_30fps.mp4",
  maxSize = 500, // Maks dikdörtgen boyutu (px, ekranda)
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [enabled, setEnabled] = useState(false);

  const isDrawingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const rectRef = useRef(null);
  const videoDimsRef = useRef({ vw: 1920, vh: 1080 }); // Gerçek video boyutu (metadata’dan güncellenir)

  // Son logu ekranda göstermek isterseniz:
  const [lastLog, setLastLog] = useState(null);

  // Video metadata yüklendiğinde gerçek video boyutunu al
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      const vw = v.videoWidth || 1920;
      const vh = v.videoHeight || 1080;
      videoDimsRef.current = { vw, vh };
    };
    v.addEventListener("loadedmetadata", onMeta);
    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, []);

  // Canvas’ı container ölçülerine ve DPR’a göre ölçekle (responsive ve keskin çizim)
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const r = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      const ctx = canvas.getContext("2d");
      // Çizimleri CSS pikseli üzerinden yapabilmek için dönüşüm:
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawCanvas();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    return () => ro.disconnect();
  }, []);

  const getDisplaySize = () => {
    const canvas = canvasRef.current;
    const r = canvas.getBoundingClientRect();
    return { dw: r.width, dh: r.height };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { dw, dh } = getDisplaySize();
    ctx.clearRect(0, 0, dw, dh);
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { dw, dh } = getDisplaySize();
    ctx.clearRect(0, 0, dw, dh);

    const rect = rectRef.current;
    if (rect) {
      ctx.strokeStyle = "#00e0ff";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

      // Orta nokta işareti
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      ctx.setLineDash([]);
      ctx.fillStyle = "#00e0ff";
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const clampRectToBounds = (x0, y0, w, h, boundW, boundH) => {
    // Ekran pikselinde sınırlama (maxSize)
    const limitedW = Math.min(Math.abs(w), maxSize);
    const limitedH = Math.min(Math.abs(h), maxSize);

    // Ham top-left
    let left = w < 0 ? x0 - limitedW : x0;
    let top = h < 0 ? y0 - limitedH : y0;

    // Kenarlara taşmayı engelle
    left = Math.max(0, Math.min(left, boundW));
    top = Math.max(0, Math.min(top, boundH));

    // Genişlik/yükseklik canvas içinde kalsın
    const width = Math.min(limitedW, boundW - left);
    const height = Math.min(limitedH, boundH - top);

    return { x: left, y: top, w: width, h: height };
  };

  // Ekran koordinatlarını video piksel koordinatlarına çevir
  const toVideoPx = (x, y) => {
    const { dw, dh } = getDisplaySize();
    const { vw, vh } = videoDimsRef.current;
    const scaleX = vw / dw;
    const scaleY = vh / dh;
    return { column: Math.round(x * scaleX), row: Math.round(y * scaleY) };
  };

  const logJson = ({ w, h, cx, cy }) => {
    const { dw, dh } = getDisplaySize();
    const { vw, vh } = videoDimsRef.current;
    const scaleX = vw / dw;
    const scaleY = vh / dh;

    // width/height değerlerini video pikseline çevir
    const payload = {
      width: Math.round(w * scaleX),
      height: Math.round(h * scaleY),
      column: Math.round(cx * scaleX),
      row: Math.round(cy * scaleY),
    };

    // İstenen format (JSON) → console
    console.log(JSON.stringify(payload));
    setLastLog(payload);
  };

  const handleMouseDown = (e) => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    isDrawingRef.current = true;
    startRef.current = { x, y };
    rectRef.current = { x, y, w: 0, h: 0 };
    drawCanvas();

    // İlk tıklamada log: width=0, height=0, merkez tıklanan nokta
    logJson({ w: 0, h: 0, cx: x, cy: y });
  };

  const handleMouseMove = (e) => {
    if (!enabled || !isDrawingRef.current) return;

    const canvas = canvasRef.current;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    const start = startRef.current;
    const rawW = x - start.x;
    const rawH = y - start.y;

    const clipped = clampRectToBounds(
      start.x,
      start.y,
      rawW,
      rawH,
      r.width,
      r.height
    );

    rectRef.current = clipped;
    drawCanvas();
  };

  const finalize = () => {
    const rect = rectRef.current;
    if (rect) {
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      // Çizim bittiğinde log
      logJson({ w: rect.w, h: rect.h, cx, cy });
    }
  };

  const handleMouseUp = () => {
    if (!enabled || !isDrawingRef.current) return;
    isDrawingRef.current = false;
    drawCanvas();
    finalize();
  };

  const handleMouseLeave = (e) => {
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
        clearCanvas();
        setLastLog(null);
      }
      return next;
    });
  };

  return (
    <div>
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
          }}
        >
          {enabled ? "Çizimi Kapat ve Temizle" : "Çizimi Aç"}
        </button>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          {enabled
            ? "Mouse ile dikdörtgen çizin (maks 500x500 px)."
            : "Çizim devre dışı."}
        </span>
      </div>

      {/* 16:9 responsive container – video ekranı tam doldurur ve orantı korunur */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "1200px",
          aspectRatio: "16 / 9",
          background: "#000",
          borderRadius: 8,
          overflow: "hidden",
          userSelect: "none",
        }}
      >
        <video
          ref={videoRef}
          src={src}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          controls
          playsInline
        />
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            cursor: enabled ? "crosshair" : "default",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>

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

export default VideoRectangleAnnotator;