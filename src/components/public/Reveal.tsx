import type { ReactNode } from "react";
import { useScrollReveal } from "../../hooks/useScrollReveal";

export default function Reveal({
  children,
  as: Tag = "div",
  className = "",
  delay
}: {
  children: ReactNode;
  as?: "div" | "section";
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useScrollReveal<HTMLDivElement>();
  return (
    <Tag
      ref={ref as never}
      className={`reveal${inView ? " reveal-visible" : ""}${className ? ` ${className}` : ""}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
