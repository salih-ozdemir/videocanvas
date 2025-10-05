 React projesi. 
- Video üzerinde dikdortgen şekil çizip bunun width ve height değerini almak istiyorum
- Şekil max. 500x500px. 
- Çizilen dikdörtgenin orta noktasini bulup bunu aynı zaman da çizim yaptığım videonun piksel koordinat değerini vermeli yani column ve row. 
- video ekranı tam doldurmalı. responsive
- video 1080p görüntü aktarıyor. ekran responsive ise ona göre pixel değerleri hesaplanmalı.
- bir buton aktif edildiğinde çizim yapmalı, kapatıldığında çizim yapmamalı ve önceki çizilenleri kaldırmalıdır.
- mouse ile çizilmeli
gpt-5-pro ai model's icon
GPT 5 Pro
1 day ago





































- React projesi. 

- Video üzerinde dikdortgen şekil çizip bunun width ve height değerini almak istiyorum

- Şekil max. 500x500px. 

- Çizilen dikdörtgenin orta noktasini bulup bunu aynı zaman da çizim yaptığım videonun piksel koordinat değerini vermeli yani column ve row. 

- video ekranı tam doldurmalı. responsive

- video 1080p görüntü aktarıyor. ekran responsive ise ona göre pixel değerleri hesaplanmalı.

- bir buton aktif edildiğinde çizim yapmalı, kapatıldığında çizim yapmamalı ve önceki çizilenleri kaldırmalıdır.

- mouse ile çizilmeli
- mouse click yapıldığında console width, height, column ve row JSON biçiminde yazılmalı
- yine tıkladığında ve çizim bittiğinde, console width, height, column ve row JSON biçiminde
gpt-5-pro ai model's icon
GPT 5 Pro
1 day ago



























Aşağıdaki React bileşeni, videonun üzerinde mouse ile dikdörtgen çizmenizi sağlar; dikdörtgeni 500x500 px ile sınırlar, merkez noktasını hesaplar ve hem ilk tıklamada hem de çizim bittiğinde width, height, column, row değerlerini video piksel koordinatlarında JSON olarak console’a yazar. Video alanı responsive olup 16:9 oranını korur; 1080p (veya gelen gerçek video boyutu) temel alınarak doğru piksel dönüşümü yapılır. Çizimi aç/kapat butonuyla çizim modunu yönetebilir ve kapatınca önceki çizimi temizler.

Kod (VideoRectangleAnnotator.jsx)

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
Nasıl çalışır

Çizim aç/kapat: Butonla çizimi etkinleştirirsiniz. Kapatıldığında tuval temizlenir ve önceki çizim silinir.
Mouse ile çizim: Basılı tutup sürükleyin. Dikdörtgen boyutu ekranda maksimum 500x500 px ile sınırlandırılır ve canvas sınırlarının dışına taşmaz.
JSON loglama:
İlk tıklamada: width=0, height=0 ve tıklanan noktanın video piksel koordinatları (column, row) console’a JSON olarak yazılır.
Mouse’u bıraktığınızda: Son dikdörtgenin width, height ve orta noktasının video piksel koordinatları (column, row) JSON olarak yazılır.
Video pikseline dönüşüm: Ekrandaki koordinatlar, anlık canvas boyutuna göre videoWidth/videoHeight oranlarıyla 1:1 doğru biçimde 1080p (veya gerçek video boyutu) pikseline çevrilir. 16:9 oranı korunduğu için deformasyon veya kırpma olmaz.
Responsive tam dolum: Kapsayıcı 16:9’dur ve genişliğe göre yükseklik ayarlanır; video yüzde 100 doldurur. Pencere boyutu değiştiğinde ResizeObserver ile canvas yeniden ölçeklenir.
Kullanım

Bileşeni projenize ekleyin ve src olarak video URL’sini verin:
import VideoRectangleAnnotator from "./VideoRectangleAnnotator";
export default function App() {
  return (
    <div style={{ padding: 16 }}>
      <VideoRectangleAnnotator
        src="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/BBB_1080_30fps.mp4"
        maxSize={500}
      />
    </div>
  );
}
Notlar ve opsiyonlar

width/height değerleri video pikselinde loglanır (ör. 1080p’de 1920x1080 ölçeğinde). İsterseniz ekranda (CSS px) değerlerini de ayrıca loglayabilirim.
Çoklu dikdörtgen çizimi veya ESC ile iptal gibi ek özellikler isterseniz kolayca eklenebilir.
Eğer video akışı 1080p’den farklıysa (ör. 1280x720), bileşen bunu metadata’dan otomatik alır ve dönüşümleri buna göre yapar.
Özet

Mouse ile dikdörtgen çizimi, 500x500 px sınırı, responsive 16:9 video alanı, doğru video piksel koordinat hesaplaması ve JSON loglama gereksinimleriniz bu bileşende tam olarak karşılanır. İsterseniz farklı etkileşimler veya olay geri bildirimleri (callback) ekleyelim.
antmedia kullanıyorum. mevcut kodu antmedia player üzerinde entegre edebilir misin
https://antmedia.io/how-to-easily-integrate-ant-media-web-player/
gpt-5-pro ai model's icon
GPT 5 Pro
1 day ago


















Aşağıdaki çözüm, Ant Media Web Player’ı React içinde başlatır, player’ın yerleştirdiği video öğesinin üstüne bir canvas overlay koyar, mouse ile 500×500 px sınırıyla dikdörtgen çizmeye izin verir, hem ilk tıklamada hem de çizim bittiğinde width, height ve merkez koordinatlarını video piksel uzayında (column=x, row=y) JSON olarak console’a yazar. Video alanı responsive tutulur ve ekranı tam doldurması için object-fit “cover” varsayılan gelir. İsterseniz “contain” ile kırpmayı kapatabilirsiniz. Ant Media Web Player entegrasyonu, resmi rehberde gösterilen yöntemle yapılır: How to Easily Integrate Ant Media Web Player into Your Project.

Kurulum

Paket: npm i @antmedia/web_player
Bileşen (AntMediaRectangleOverlay.jsx)

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
  const offsetX = (containerW - displayW) / 2; // cover'da negatif olabilir
  const offsetY = (containerH - displayH) / 2;
  return { scale, offsetX, offsetY, displayW, displayH };
}
export default function AntMediaRectangleOverlay({
  httpBaseURL,            // Örn: "https://your-antmedia-domain:5443/WebRTCAppEE"
  streamId,               // Örn: "teststream"
  token,                  // Opsiyonel
  playOrder = ["webrtc", "hls", "dash"],
  autoplay = true,
  muted = true,
  // Overlay davranışları
  maxRect = 500,          // Ekran pikselinde maks dikdörtgen boyutu (500x500)
  fit = "cover",          // "cover" (ekranı doldurur, kırpma olabilir) veya "contain"
  startEnabled = false,
  // Boyutlandırma
  containerStyle = { width: "100%", height: "60vh" }, // İsterseniz { height: "100vh" } yapın
}) {
  const containerRef = useRef(null);     // Player videoContainer
  const placeHolderRef = useRef(null);   // Placeholder alanı
  const playerRef = useRef(null);        // Ant Media WebPlayer
  const videoElRef = useRef(null);       // Yerleştirilen gerçek <video>
  const canvasRef = useRef(null);
  const [enabled, setEnabled] = useState(startEnabled);
  const isDrawingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const rectRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const videoSizeRef = useRef({ w: 1920, h: 1080 }); // metadata'dan güncellenir
  // Son logu UI'de göstermek isterseniz:
  const [lastLog, setLastLog] = useState(null);
  // Player'ı başlat
  useEffect(() => {
    if (!containerRef.current) return;
    // Video HTML içerik (object-fit ve pointer-events ayarlı)
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
      containerRef.current,
      placeHolderRef.current
    );
    playerRef.current
      .initialize()
      .then(() => playerRef.current.play())
      .catch((err) => console.error("Ant Media WebPlayer init error:", err));
    return () => {
      // Dokümanda destroy/stop çağrısı örneği yok; sadece referansı bırakıyoruz.
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [httpBaseURL, streamId, token, fit, autoplay, muted]);
  // Yerleştirilen gerçek <video> elementini referans al ve metadata'yı oku
  useEffect(() => {
    const findVideoEl = () => {
      if (!containerRef.current) return null;
      // Kendi id'mizi verdik: #ant-video
      const v = containerRef.current.querySelector("#ant-video") || containerRef.current.querySelector("video");
      return v || null;
    };
    const v = findVideoEl();
    if (!v) return;
    videoElRef.current = v;
    const handleMeta = () => {
      const w = v.videoWidth || 1920;
      const h = v.videoHeight || 1080;
      videoSizeRef.current = { w, h };
    };
    v.addEventListener("loadedmetadata", handleMeta);
    // Eğer metadata hazırsa hemen al
    if (v.readyState >= 1) handleMeta();
    return () => {
      v.removeEventListener("loadedmetadata", handleMeta);
    };
  }, [containerRef.current]);
  // Container ve canvas responsive ölçüm
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const resize = () => {
      const r = container.getBoundingClientRect();
      setContainerSize({ w: r.width, h: r.height });
      // DPR ile ölçek
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
    ro.observe(container);
    resize();
    return () => ro.disconnect();
  }, []);
  const fitParams = useMemo(() => {
    return computeFitParams(
      containerSize.w,
      containerSize.h,
      videoSizeRef.current.w,
      videoSizeRef.current.h,
      fit
    );
  }, [containerSize, fit]);
  const containerToVideo = (cx, cy) => {
    const { scale, offsetX, offsetY } = fitParams;
    const vx = (cx - offsetX) / (scale || 1);
    const vy = (cy - offsetY) / (scale || 1);
    return {
      x: clamp(vx, 0, videoSizeRef.current.w),
      y: clamp(vy, 0, videoSizeRef.current.h),
    };
  };
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    const rect = rectRef.current;
    if (rect) {
      ctx.strokeStyle = "#00e0ff";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      ctx.setLineDash([]);
      ctx.fillStyle = "#00e0ff";
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
      // Ekranda küçük ölçü etiketi
      const label = `${Math.round(rect.w)}×${Math.round(rect.h)} px (screen)`;
      const padding = 6;
      ctx.font = "12px sans-serif";
      const textW = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(rect.x, rect.y - 24, textW + padding * 2, 18);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, rect.x + padding, rect.y - 11);
    }
  };
  const clampRectToBounds = (x0, y0, w, h, boundW, boundH) => {
    // Maks 500×500 ekran pikseli
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
    // Video pikseline dönüştür (cover/contain offset + ölçek ile)
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
    // İlk tıklamada JSON log (width=0, height=0; merkez tıklanan nokta)
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
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.clientWidth, canvasRef.current.clientHeight);
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
          {enabled
            ? "Mouse ile dikdörtgen çizin (maks 500×500 px)."
            : "Çizim devre dışı."}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>
          fit: {fit} · video: {videoSizeRef.current.w}×{videoSizeRef.current.h}px
        </span>
      </div>
      {/* Ant Media Web Player container + placeholder + overlay */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          background: "#000",
          borderRadius: 8,
          overflow: "hidden",
          userSelect: "none",
          ...containerStyle,
        }}
      >
        {/* Placeholder (stream başlamadan gösterilir) */}
        <div
          ref={placeHolderRef}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#cbd5e1",
            background: "#0b1220",
            zIndex: 1,
          }}
        >
          Yayın kısa süre içinde başlayacak…
        </div>
        {/* Overlay canvas */}
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
        {/* Video element, WebPlayer tarafından containerRef içine en alta yerleştirilir.
            videoHTMLContent ile style="object-fit: {fit}; pointer-events: none" verildi. */}
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
Kullanım

import React from "react";
import AntMediaRectangleOverlay from "./AntMediaRectangleOverlay";
export default function App() {
  return (
    <div style={{ padding: 16 }}>
      <AntMediaRectangleOverlay
        httpBaseURL="https://your-antmedia-domain:5443/WebRTCAppEE" // Sunucu/uygulama URL'iniz
        streamId="yourStreamId"                                      // Yayın ID
        token={undefined}                                            // Token kullanıyorsanız string verin
        playOrder={["webrtc", "hls", "dash"]}
        autoplay={true}
        muted={true}
        maxRect={500}
        fit="cover"                                                  // "cover" ekranı doldurur; "contain" kırpmaz
        startEnabled={false}
        containerStyle={{ width: "100%", height: "60vh" }}           // Tam ekran için height: "100vh"
      />
    </div>
  );
}
Açıklamalar

Ant Media Web Player, video elementini videoContainer içine yerleştirir; biz de overlay canvas’ı aynı container içine “absolute” koyarak üstten mouse olaylarını yakalıyoruz. Video’ya pointer-events:none verdiğimiz için tıklamalar canvas’a gider.
Dönüşüm doğruluğu: Ekran koordinatlarını video pikseline çevirirken object-fit “cover/contain” durumuna göre ölçek ve ofset (offsetX/offsetY) hesaba katılır. Bu sayede kırpma olsa bile column/row doğru hesaplanır.
JSON loglama:
Mouse down: width=0, height=0 ve tıklama merkezinin video piksel koordinatları.
Mouse up/çizim bitişi: Dikdörtgen width/height ve merkez koordinatları.
1080p (veya gerçek çözünürlük) metadata’dan alınır; Metadata hazır değilse geçici 1920×1080 varsayılır ve hazır olduğunda güncellenir.
Çizimi kapatınca önceki şekil temizlenir ve log paneli sıfırlanır.
İsterseniz

Birden fazla dikdörtgen, ESC ile iptal, tuş kısayolları, dışarıya callback ile ölçümleri verme (onDrawStart/onDrawEnd) gibi özellikleri ekleyebilirim.
“contain” moduna alıp siyah şerit/letterbox ile kırpmasız doğru koordinatlar görebilirsiniz; “cover” ile ekran dolu görünürlük sağlanır.