"use client";

import * as React from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Catches errors in the **root layout** itself (i.e. errors thrown
 * while rendering `<html>`, `<body>`, sidebar, navbar, or any of the
 * layout-level mounts like `WasmStegoPriming`).
 *
 * Next.js automatically wraps the app in this component when it
 * exists. It must include `<html>` and `<body>` because the regular
 * layout has already been replaced by an error state.
 *
 * We deliberately keep this minimal and self-contained: no client
 * components beyond itself, no async data fetching, no external
 * imports. That way the boundary always renders even if the rest of
 * the app is broken.
 *
 * The "Try again" button calls Next's `reset()` to re-attempt
 * rendering. "Reload page" is a plain anchor because `reset()` can
 * legitimately fail if the underlying error is deterministic.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps): React.ReactElement {
  React.useEffect(() => {
    console.error("[Stegabyte] Global error boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000",
          color: "#fafafa",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <main
          role="alert"
          aria-labelledby="global-error-title"
          style={{
            maxWidth: "32rem",
            margin: "1.5rem",
            padding: "1.75rem",
            textAlign: "center",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "0.75rem",
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(8px)",
          }}
        >
          <h1
            id="global-error-title"
            style={{
              margin: 0,
              fontSize: "1.125rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              marginTop: "0.75rem",
              marginBottom: 0,
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1.5,
            }}
          >
            Stegabyte hit an unexpected error. Your data is still safe —
            everything runs locally and nothing has left your browser.
          </p>
          <div
            style={{
              marginTop: "1.25rem",
              display: "flex",
              gap: "0.5rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.8125rem",
                fontWeight: 500,
                borderRadius: "0.375rem",
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.06)",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.8125rem",
                fontWeight: 500,
                borderRadius: "0.375rem",
                border: "1px solid rgba(255,255,255,0.16)",
                background: "transparent",
                color: "inherit",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Go home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
