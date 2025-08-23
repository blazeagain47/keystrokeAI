import React from "react";

/**
 * Renders children in-place but as an absolute overlay that does not
 * participate in layout, so underlying content (typing console) does not move.
 * Parent container must be `relative`.
 */
export default function PreTestOverlay({
  show,
  children,
  position = "fixed",
  z = "z-40",
}: {
  show: boolean;
  children: React.ReactNode;
  /** "fixed" or "absolute" */
  position?: "fixed" | "absolute";
  /** Tailwind z-index utility */
  z?: string;
}) {
  if (!show) return null;
  return (
    <div
      className={[
        position === "fixed" ? "fixed" : "absolute",
        "left-1/2 -translate-x-1/2 w-full",
        "max-w-6xl px-4",
        "pointer-events-auto",
        z,
      ].join(" ")}
      style={{ top: "var(--bk-header-h, 64px)" }}
      aria-hidden={false}
    >
      {children}
    </div>
  );
}


