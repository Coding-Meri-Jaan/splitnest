"use client";

/**
 * Last-resort fallback when the root layout itself cannot render. Kept
 * dependency-free and inline-styled because global CSS is not loaded here.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f6f6f6",
          color: "#111",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <main
          style={{
            maxWidth: 460,
            padding: 28,
            background: "#fff",
            border: "1px solid #e5e5e5",
            borderRadius: 14,
          }}
        >
          <h1 style={{ margin: "0 0 8px", fontSize: 20 }}>
            SplitNest could not load
          </h1>
          <p style={{ margin: "0 0 20px", color: "#555", lineHeight: 1.5 }}>
            Your session is safe. Reload the page; if it keeps failing, the
            database setup may be incomplete.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Reload
            </button>
            <a
              href="/api/health"
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #ccc",
                color: "#111",
                textDecoration: "none",
              }}
            >
              Open setup report
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
