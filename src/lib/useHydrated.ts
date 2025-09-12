"use client";
import * as React from "react";

export function useHydrated() {
  const [h, setH] = React.useState(false);
  React.useEffect(() => setH(true), []);
  return h;
}
