import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";

// Matches your existing S constants from authStyles.ts
const S = {
  bg:         "hsl(220,25%,10%)",
  bgDeep:     "hsl(220,28%,7%)",
  surface:    "hsl(220,20%,14%)",
  accent:     "hsl(220,20%,16%)",
  primary:    "hsl(199,89%,48%)",
  primaryDim: "hsl(199,89%,38%)",
  muted:      "hsl(220,10%,46%)",
  border:     "hsl(220,20%,18%)",
  foreground: "hsl(220,14%,85%)",
} as const;

export default function NotFoundPage() {
  const navigate  = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Subtle floating particles — reuses the same vibe as your login page
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const dots = Array.from({ length: 60 }, () => ({
      x:  Math.random() * window.innerWidth,
      y:  Math.random() * window.innerHeight,
      r:  Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      o:  Math.random() * 0.4 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0) d.x = canvas.width;
        if (d.x > canvas.width) d.x = 0;
        if (d.y < 0) d.y = canvas.height;
        if (d.y > canvas.height) d.y = 0;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(199,89%,48%,${d.o})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      style={{
        minHeight:       "100vh",
        backgroundColor: S.bgDeep,
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        position:        "relative",
        overflow:        "hidden",
        fontFamily:      "'DM Mono', 'Fira Code', monospace",
      }}
    >
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      />

      {/* Radial glow behind content */}
      <div
        style={{
          position:        "absolute",
          width:           "600px",
          height:          "600px",
          borderRadius:    "50%",
          background:      `radial-gradient(circle, hsla(199,89%,48%,0.06) 0%, transparent 70%)`,
          pointerEvents:   "none",
        }}
      />

      {/* Card */}
      <div
        style={{
          position:        "relative",
          zIndex:          1,
          backgroundColor: S.surface,
          border:          `1px solid ${S.border}`,
          borderRadius:    "16px",
          padding:         "56px 64px",
          textAlign:       "center",
          maxWidth:        "480px",
          width:           "90%",
          boxShadow:       `0 0 0 1px ${S.border}, 0 32px 64px hsla(220,28%,4%,0.6)`,
          animation:       "fadeUp 0.5s ease both",
        }}
      >
        {/* 404 big number */}
        <div
          style={{
            fontSize:       "96px",
            fontWeight:     "700",
            lineHeight:     "1",
            letterSpacing:  "-4px",
            background:     `linear-gradient(135deg, ${S.primary}, ${S.primaryDim})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor:  "transparent",
            backgroundClip: "text",
            marginBottom:   "4px",
            animation:      "fadeUp 0.5s 0.1s ease both",
          }}
        >
          404
        </div>

        {/* Divider line */}
        <div
          style={{
            width:           "48px",
            height:          "2px",
            background:      S.primary,
            margin:          "20px auto",
            borderRadius:    "2px",
            opacity:         0.5,
            animation:       "fadeUp 0.5s 0.2s ease both",
          }}
        />

        {/* Title */}
        <p
          style={{
            fontSize:      "18px",
            fontWeight:    "600",
            color:         S.foreground,
            marginBottom:  "10px",
            letterSpacing: "0.02em",
            animation:     "fadeUp 0.5s 0.25s ease both",
          }}
        >
          Page Not Found
        </p>

        {/* Subtitle */}
        <p
          style={{
            fontSize:     "13px",
            color:        S.muted,
            marginBottom: "36px",
            lineHeight:   "1.6",
            animation:    "fadeUp 0.5s 0.3s ease both",
          }}
        >
          The route you're looking for doesn't exist or you don't have access to it.
        </p>

        {/* Go Home button */}
        <button
          onClick={() => navigate("/")}
          style={{
            display:         "inline-flex",
            alignItems:      "center",
            gap:             "8px",
            backgroundColor: S.primary,
            color:           "#fff",
            border:          "none",
            borderRadius:    "8px",
            padding:         "11px 28px",
            fontSize:        "13px",
            fontWeight:      "600",
            cursor:          "pointer",
            letterSpacing:   "0.03em",
            transition:      "background-color 0.2s, transform 0.15s",
            animation:       "fadeUp 0.5s 0.35s ease both",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = S.primaryDim;
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = S.primary;
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
          }}
        >
          ← Go Home
        </button>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </div>
  );
}