import { useEffect, useRef, useState } from "react";

/**
 * Dezente Scroll-Reveal-Animation: Element wird beobachtet und sobald es
 * (teilweise) sichtbar wird, auf "in view" gesetzt (bleibt danach sichtbar).
 * Respektiert prefers-reduced-motion, indem sofort "in view" zurückgegeben
 * wird, ohne den IntersectionObserver überhaupt zu nutzen.
 */
export function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setInView(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}
