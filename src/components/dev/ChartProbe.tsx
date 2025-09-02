"use client";
import * as React from "react";

export function ChartProbe({
  name,
  data,
  containerRef,
}: {
  name: string;
  data: Array<any>;
  containerRef: React.RefObject<HTMLElement | null>;
}) {
  const [box, setBox] = React.useState<{w:number;h:number}>({w:0,h:0});
  React.useEffect(() => {
    const el = containerRef.current as HTMLElement | null;
    const read = () => {
      const r = el?.getBoundingClientRect?.();
      setBox({ w: Math.round(r?.width ?? 0), h: Math.round(r?.height ?? 0) });
    };
    read();
    const ro = el ? new ResizeObserver(read) : null;
    if (el && ro) ro.observe(el);
    return () => ro?.disconnect();
  }, [containerRef]);

  React.useEffect(() => {
    // One concise log with all the vital context
    console.log(`[${name}] points=${data?.length ?? 0}`, {
      first5: (data ?? []).slice(0, 5),
      container: box,
    });
  }, [name, data, box]);

  return (
    <div
      style={{
        position: "absolute",
        right: 8,
        bottom: 8,
        zIndex: 50,
        fontSize: 11,
        padding: "6px 8px",
        borderRadius: 8,
        color: "white",
        background: "rgba(0,0,0,.45)",
        border: "1px solid rgba(255,255,255,.18)",
        backdropFilter: "blur(6px)",
        pointerEvents: "none",
      }}
    >
      <div style={{opacity:.85}}>
        <strong>{name}</strong> • pts: {data?.length ?? 0} • {box.w}×{box.h}
      </div>
    </div>
  );
}
