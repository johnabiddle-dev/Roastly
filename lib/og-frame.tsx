type OgFrameProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

export function OgFrame({ eyebrow, title, subtitle }: OgFrameProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#09090b",
        color: "white",
        padding: "56px 64px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 999,
              background: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            R
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>Roastly</div>
        </div>
        <div
          style={{
            fontSize: 20,
            color: "#fca5a5",
            background: "#450a0a",
            border: "1px solid #7f1d1d",
            padding: "10px 16px",
            borderRadius: 999,
          }}
        >
          {eyebrow}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 980 }}>
        <div
          style={{
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -2,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 28, color: "#d4d4d8", lineHeight: 1.35 }}>{subtitle}</div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          color: "#a1a1aa",
          fontSize: 22,
        }}
      >
        <div style={{ display: "flex", gap: 12 }}>
          <div
            style={{
              background: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: 14,
              padding: "10px 16px",
              color: "#fff",
            }}
          >
            3 free
          </div>
          <div
            style={{
              background: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: 14,
              padding: "10px 16px",
              color: "#fff",
            }}
          >
            $1
          </div>
          <div
            style={{
              background: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: 14,
              padding: "10px 16px",
              color: "#fff",
            }}
          >
            $4.99
          </div>
          <div
            style={{
              background: "#7f1d1d",
              border: "1px solid #ef4444",
              borderRadius: 14,
              padding: "10px 16px",
              color: "#fff",
            }}
          >
            $19.99
          </div>
        </div>
        <div>roastly-app.vercel.app</div>
      </div>
    </div>
  );
}
