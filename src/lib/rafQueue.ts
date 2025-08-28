export function createRafQueue<T>(flush: (items: T[]) => void) {
  let buf: T[] = [];
  let raf = 0;

  return (item: T) => {
    buf.push(item);
    if (raf) return;

    raf = requestAnimationFrame(() => {
      const items = buf;
      buf = [];
      raf = 0;
      flush(items);
    });
  };
}
