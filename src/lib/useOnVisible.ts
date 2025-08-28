import { useEffect, useRef, useState } from 'react';

export function useOnVisible<T extends Element>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      options
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [visible, options]);

  return { ref, visible };
}