import { useState } from "react";

export default function DemoAccountTooltip() {
  const [show, setShow] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-flex", justifyContent: "center" }}>
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        style={{
          display:         "inline-flex",
          alignItems:      "center",
          gap:             "6px",
          background:      "hsl(199 89% 48% / 0.08)",
          border:          "1px solid hsl(199 89% 48% / 0.30)",
          borderRadius:    "20px",
          padding:         "4px 12px",
          fontSize:        "11.5px",
          fontWeight:      600,
          color:           "hsl(199,89%,62%)",
          letterSpacing:   "0.02em",
          cursor:          "help",
          fontFamily:      "'DM Sans', sans-serif",
          transition:      "border-color 0.2s, background 0.2s",
        }}
      >
        🎮 Try a Demo Account
      </button>

      {show && (
        <div style={{
          position:        "absolute",
          bottom:          "calc(100% + 10px)",
          left:            "50%",
          transform:       "translateX(-50%)",
          backgroundColor: "hsl(220,22%,13%)",
          border:          "1px solid hsl(220,20%,24%)",
          borderRadius:    "12px",
          padding:         "14px 16px",
          width:           "240px",
          zIndex:          200,
          boxShadow:       "0 12px 40px hsl(220 28% 4% / 0.75), 0 0 0 1px hsl(220 20% 20% / 0.5)",
          pointerEvents:   "none",
          textAlign:       "left",
        }}>
          {/* Down arrow */}
          <span style={{
            position:    "absolute",
            top:         "100%",
            left:        "50%",
            transform:   "translateX(-50%)",
            width:       0,
            height:      0,
            borderLeft:  "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop:   "7px solid hsl(220,20%,24%)",
          }} />

          {/* Title */}
          <p style={{
            fontSize:      "10px",
            fontWeight:    700,
            color:         "hsl(199,89%,62%)",
            marginBottom:  "10px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily:    "'DM Mono', monospace",
          }}>
            Demo Account
          </p>

          {/* Email */}
          <div style={{ marginBottom: "8px" }}>
            <p style={{ fontSize: "10px", color: "hsl(220,10%,46%)", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 600 }}>
              Email
            </p>
            <p style={{ fontSize: "12.5px", color: "hsl(220,14%,88%)", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>
              test.standard@gmail.com
            </p>
          </div>

          {/* Password */}
          <div style={{ marginBottom: "10px" }}>
            <p style={{ fontSize: "10px", color: "hsl(220,10%,46%)", marginBottom: "3px", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 600 }}>
              Password
            </p>
            <p style={{ fontSize: "12.5px", color: "hsl(220,14%,88%)", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>
              test1234
            </p>
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: "hsl(220,20%,22%)", marginBottom: "10px" }} />

          {/* Role note */}
          <p style={{ fontSize: "11.5px", color: "hsl(220,10%,52%)", lineHeight: "1.6", fontFamily: "'DM Sans', sans-serif" }}>
            Standard User only — can view, add, and request transaction deletions. Admin features are restricted.
          </p>
        </div>
      )}
    </div>
  );
}