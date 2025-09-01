export type RafItem<T> = T & { __ts?: number };

export function createRafQueue<T>(
  flush: (items: RafItem<T>[]) => void,
  opts?: { sort?: (a: RafItem<T>, b: RafItem<T>) => number }
) {
  let buf: RafItem<T>[] = [];
  let raf = 0;

  return (item: T | RafItem<T>) => {
    const withTs: RafItem<T> = (item as RafItem<T>).__ts
      ? (item as RafItem<T>)
      : ({ ...(item as any), __ts: performance.now() } as RafItem<T>);
    buf.push(withTs);
    if (raf) return;

    raf = requestAnimationFrame(() => {
      const items = buf;
      buf = [];
      raf = 0;
      if (opts?.sort) items.sort(opts.sort);
      flush(items);
    });
  };
}
