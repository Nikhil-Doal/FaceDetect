"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Face {
  bbox: [number, number, number, number];
  name: string;
  relation?: string;
  confidence: number;
}

const WIDTH = 640;
const HEIGHT = 480;

export default function WebcamPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [faces, setFaces] = useState<Face[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

  // Start webcam
  useEffect(() => {
    let stream: MediaStream;

    navigator.mediaDevices
      .getUserMedia({ video: { width: WIDTH, height: HEIGHT } })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsConnected(true);
        }
      })
      .catch((err) => {
        setError("Camera access denied. Please allow camera permissions.");
        console.error(err);
      });

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Capture + recognize
  useEffect(() => {
    const interval = setInterval(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.videoWidth === 0) return;

      canvas.width = WIDTH;
      canvas.height = HEIGHT;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, WIDTH, HEIGHT);
      const image = canvas.toDataURL("image/jpeg", 0.6);

      setIsScanning(true);

      try {
        const token = localStorage.getItem("token");
        
        const res = await fetch("http://localhost:5000/api/recognize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({ image }),
        });

        if (!res.ok) {
          if (res.status === 401) {
            setError("Authentication required. Please log in.");
          }
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        setFaces(Array.isArray(data) ? data : []);
        setLastScanTime(new Date());
        setError(null);
      } catch (err) {
        console.error(err);
      } finally {
        setIsScanning(false);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const getConfidenceColor = useCallback((confidence: number) => {
    if (confidence >= 0.7) return { border: "#00ff88", bg: "rgba(0, 255, 136, 0.1)", text: "#00ff88" };
    if (confidence >= 0.5) return { border: "#00d4ff", bg: "rgba(0, 212, 255, 0.1)", text: "#00d4ff" };
    if (confidence >= 0.3) return { border: "#ffa500", bg: "rgba(255, 165, 0, 0.1)", text: "#ffa500" };
    return { border: "#ff4757", bg: "rgba(255, 71, 87, 0.1)", text: "#ff4757" };
  }, []);

  const knownFaces = faces.filter((f) => f.name !== "Unknown");
  const unknownFaces = faces.filter((f) => f.name === "Unknown");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 font-sans">
      {/* Animated background grid */}
      <div 
        className="fixed inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 212, 255, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Header */}
      <div className="relative z-10 mb-8 text-center">
        <h1 
          className="text-4xl font-bold tracking-wider mb-2"
          style={{
            background: "linear-gradient(135deg, #00d4ff 0%, #00ff88 50%, #00d4ff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 0 40px rgba(0, 212, 255, 0.5)",
          }}
        >
          FACIAL RECOGNITION
        </h1>
        <p className="text-slate-400 text-sm tracking-widest uppercase">
          Real-time Identity Scanner
        </p>
      </div>

      {/* Main container */}
      <div className="relative z-10 flex gap-6 items-start">
        {/* Video feed container */}
        <div className="relative">
          {/* Outer glow frame */}
          <div 
            className="absolute -inset-1 rounded-lg opacity-75 blur-sm"
            style={{
              background: isScanning 
                ? "linear-gradient(135deg, #00d4ff, #00ff88, #00d4ff)" 
                : "linear-gradient(135deg, #1e293b, #334155)",
              animation: isScanning ? "pulse 1s ease-in-out infinite" : "none",
            }}
          />
          
          {/* Video wrapper */}
          <div 
            className="relative bg-slate-900 rounded-lg overflow-hidden"
            style={{ 
              width: WIDTH, 
              height: HEIGHT,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
          >
            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-cyan-400 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-cyan-400 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-cyan-400 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-cyan-400 rounded-br-lg" />

            {/* Video element */}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />

            <canvas ref={canvasRef} className="hidden" />

            {/* Scanning line effect */}
            {isScanning && (
              <div 
                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent pointer-events-none"
                style={{
                  animation: "scanLine 2s ease-in-out infinite",
                  boxShadow: "0 0 20px 5px rgba(0, 212, 255, 0.5)",
                }}
              />
            )}

            {/* Face bounding boxes */}
            {faces.map((f, i) => {
              const [x1, y1, x2, y2] = f.bbox;
              const colors = getConfidenceColor(f.confidence);
              const isKnown = f.name !== "Unknown";

              return (
                <div
                  key={i}
                  className="absolute pointer-events-none transition-all duration-200"
                  style={{
                    left: x1,
                    top: y1,
                    width: x2 - x1,
                    height: y2 - y1,
                  }}
                >
                  {/* Bounding box */}
                  <div 
                    className="absolute inset-0 rounded"
                    style={{
                      border: `2px solid ${colors.border}`,
                      backgroundColor: colors.bg,
                      boxShadow: `0 0 15px ${colors.border}40, inset 0 0 15px ${colors.border}20`,
                    }}
                  />

                  {/* Corner brackets */}
                  <div className="absolute -top-1 -left-1 w-3 h-3 border-l-2 border-t-2" style={{ borderColor: colors.border }} />
                  <div className="absolute -top-1 -right-1 w-3 h-3 border-r-2 border-t-2" style={{ borderColor: colors.border }} />
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 border-l-2 border-b-2" style={{ borderColor: colors.border }} />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 border-r-2 border-b-2" style={{ borderColor: colors.border }} />

                  {/* Label */}
                  <div 
                    className="absolute -top-10 left-0 right-0 flex flex-col items-center"
                  >
                    <div 
                      className="px-3 py-1.5 rounded-md text-xs font-bold tracking-wider whitespace-nowrap backdrop-blur-sm"
                      style={{
                        backgroundColor: `${colors.border}20`,
                        border: `1px solid ${colors.border}60`,
                        color: colors.text,
                        boxShadow: `0 4px 15px ${colors.border}30`,
                      }}
                    >
                      {isKnown ? (
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: colors.border }} />
                          {f.name.toUpperCase()}
                          {f.relation && (
                            <span className="opacity-70">• {f.relation}</span>
                          )}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          UNKNOWN
                        </span>
                      )}
                    </div>
                    <div 
                      className="mt-1 px-2 py-0.5 rounded text-[10px] font-mono"
                      style={{ 
                        color: colors.text,
                        backgroundColor: "rgba(0,0,0,0.5)",
                      }}
                    >
                      {(f.confidence * 100).toFixed(1)}% MATCH
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Status overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: isConnected ? "#00ff88" : "#ff4757" }}
                  />
                  <span className="text-slate-400 font-mono">
                    {isConnected ? "CAMERA ACTIVE" : "NO SIGNAL"}
                  </span>
                </div>
                <span className="text-slate-500 font-mono">
                  {WIDTH}×{HEIGHT} @ 5 FPS
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Info panel */}
        <div 
          className="w-72 rounded-lg overflow-hidden"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(0, 212, 255, 0.2)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Panel header */}
          <div 
            className="p-4 border-b"
            style={{ 
              borderColor: "rgba(0, 212, 255, 0.2)",
              background: "linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, transparent 100%)",
            }}
          >
            <h2 className="text-cyan-400 font-bold tracking-wider text-sm">
              DETECTION LOG
            </h2>
            <p className="text-slate-500 text-xs mt-1 font-mono">
              {lastScanTime 
                ? `Last scan: ${lastScanTime.toLocaleTimeString()}`
                : "Awaiting scan..."
              }
            </p>
          </div>

          {/* Stats */}
          <div className="p-4 border-b" style={{ borderColor: "rgba(0, 212, 255, 0.1)" }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-emerald-400">{knownFaces.length}</div>
                <div className="text-[10px] text-slate-500 tracking-wider mt-1">IDENTIFIED</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-400">{unknownFaces.length}</div>
                <div className="text-[10px] text-slate-500 tracking-wider mt-1">UNKNOWN</div>
              </div>
            </div>
          </div>

          {/* Face list */}
          <div className="p-4 max-h-64 overflow-y-auto">
            {faces.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-slate-600 text-4xl mb-3">👤</div>
                <p className="text-slate-500 text-sm">No faces detected</p>
                <p className="text-slate-600 text-xs mt-1">Position yourself in frame</p>
              </div>
            ) : (
              <div className="space-y-3">
                {faces.map((f, i) => {
                  const colors = getConfidenceColor(f.confidence);
                  return (
                    <div 
                      key={i}
                      className="rounded-lg p-3 transition-all duration-200 hover:scale-[1.02]"
                      style={{
                        backgroundColor: colors.bg,
                        border: `1px solid ${colors.border}40`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm" style={{ color: colors.text }}>
                            {f.name}
                          </div>
                          {f.relation && (
                            <div className="text-slate-400 text-xs mt-0.5">
                              {f.relation}
                            </div>
                          )}
                        </div>
                        <div 
                          className="text-xs font-mono px-2 py-1 rounded"
                          style={{ 
                            backgroundColor: `${colors.border}20`,
                            color: colors.text,
                          }}
                        >
                          {(f.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                      {/* Confidence bar */}
                      <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${f.confidence * 100}%`,
                            backgroundColor: colors.border,
                            boxShadow: `0 0 10px ${colors.border}`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Error display */}
          {error && (
            <div className="p-4 border-t" style={{ borderColor: "rgba(255, 71, 87, 0.3)" }}>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-8 text-center">
        <p className="text-slate-600 text-xs tracking-widest">
          POWERED BY INSIGHTFACE • BUFFALO_L MODEL
        </p>
      </div>

      {/* Global styles */}
      <style jsx global>{`
        @keyframes scanLine {
          0%, 100% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.75; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}