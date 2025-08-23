import * as React from "react";

/**
 * Wraps children to make them mouse/touch clickable ONLY.
 * - Not tabbable (tabIndex -1)
 * - Does not accept Enter/Space
 * - Does not steal focus on mousedown (typing area keeps focus)
 */
export default function ClickOnly(
  { onClick, className, children, ...rest }:
  React.HTMLAttributes<HTMLDivElement>
) {
  return (
    <div
      {...rest}
      data-click-only
      className={className}
      tabIndex={-1}
      role="button"
      onMouseDown={(e) => { e.preventDefault(); }}
      onClick={(e) => { e.preventDefault(); onClick?.(e); }}
      onKeyDownCapture={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onKeyUpCapture={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {children}
    </div>
  );
}


