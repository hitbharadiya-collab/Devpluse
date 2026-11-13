import React, { useEffect, useRef } from "react";

interface PulseMonitorProps {
  projectsCount: number;
  pipelinesCount: number;
  securityCount: number;
}

export const PulseMonitor: React.FC<PulseMonitorProps> = ({
  projectsCount,
  pipelinesCount,
  securityCount,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let x = 0;
    let phase = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, parent.clientWidth, parent.clientHeight);
    };

    resize();
    window.addEventListener("resize", resize);

    // Classic ECG Heartbeat waveform function (P-Q-R-S-T spike)
    const getEcgY = (t: number, midY: number, amp: number) => {
      const cycle = t % 160;
      if (cycle > 20 && cycle <= 32) {
        // P wave
        return midY - Math.sin(((cycle - 20) / 12) * Math.PI) * (amp * 0.16);
      }
      if (cycle > 42 && cycle <= 47) {
        // Q dip
        return midY + ((cycle - 42) / 5) * (amp * 0.18);
      }
      if (cycle > 47 && cycle <= 54) {
        // R tall sharp peak
        const p = (cycle - 47) / 7;
        return midY + amp * 0.18 - Math.sin(p * Math.PI) * (amp * 1.15);
      }
      if (cycle > 54 && cycle <= 61) {
        // S deep dip
        const p = (cycle - 54) / 7;
        return midY + Math.sin(p * Math.PI) * (amp * 0.36);
      }
      if (cycle > 76 && cycle <= 96) {
        // T wave
        return midY - Math.sin(((cycle - 76) / 20) * Math.PI) * (amp * 0.26);
      }
      return midY + Math.sin(t * 0.05) * 1.5;
    };

    const w = () => canvas.clientWidth || 600;
    const h = () => canvas.clientHeight || 240;

    let prevX = 0;
    let prevY = h() * 0.54;

    const drawGrid = () => {
      const width = w();
      const height = h();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.06)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < width; gx += 24) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      for (let gy = 0; gy < height; gy += 24) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }
    };

    drawGrid();

    const render = () => {
      const width = w();
      const height = h();
      const midY = height * 0.55;
      const amp = Math.min(height * 0.36, 78);
      const speed = 2.4;

      // Clear ahead of sweep bar (classic hospital monitor sweep gap)
      ctx.clearRect(x, 0, 26, height);

      // Redraw subtle grid inside cleared strip
      ctx.strokeStyle = "rgba(56, 189, 248, 0.06)";
      ctx.lineWidth = 1;
      for (let gx = Math.floor(x / 24) * 24; gx < x + 26; gx += 24) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      for (let gy = 0; gy < height; gy += 24) {
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.lineTo(x + 26, gy);
        ctx.stroke();
      }

      const nextX = x + speed;
      phase += speed;
      const nextY = getEcgY(phase, midY, amp);

      // Glowing ECG Line
      ctx.save();
      ctx.strokeStyle = "#38bdf8";
      ctx.shadowColor = "#3b82f6";
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.4;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(nextX, nextY);
      ctx.stroke();
      ctx.restore();

      // Bright leading pulse dot
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(nextX, nextY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (nextX >= width) {
        x = 0;
        prevX = 0;
        prevY = getEcgY(phase, midY, amp);
      } else {
        x = nextX;
        prevX = nextX;
        prevY = nextY;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const bpm = 72 + projectsCount * 3 + pipelinesCount * 2;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "235px",
        borderRadius: "10px",
        background: "radial-gradient(circle at 50% 50%, rgba(14, 28, 56, 0.9), rgba(6, 12, 24, 0.98))",
        border: "1px solid rgba(56, 189, 248, 0.22)",
        overflow: "hidden",
      }}
    >
      {/* Top-Left Live Pulse HUD */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 14,
          display: "flex",
          alignItems: "center",
          gap: 10,
          zIndex: 2,
          fontFamily: "Consolas, monospace",
          fontSize: 12,
          color: "#7dd3fc",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#10b981",
            boxShadow: "0 0 10px #10b981",
          }}
        />
        <span>SYSTEM HEARTBEAT · {bpm} BPM</span>
      </div>

      {/* Top-Right Telemetry Metrics */}
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 14,
          display: "flex",
          gap: 14,
          zIndex: 2,
          fontFamily: "Consolas, monospace",
          fontSize: 11.5,
          color: "#94a3b8",
        }}
      >
        <span>DB: <strong style={{ color: "#34d399" }}>12ms</strong></span>
        <span>EVENTS: <strong style={{ color: "#60a5fa" }}>{securityCount}</strong></span>
      </div>

      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
};
