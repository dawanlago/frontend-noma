import { useEffect, useRef, useState, type ReactNode } from "react";

interface StickyHorizontalScrollProps {
  children: ReactNode;
  /** Classes da área que rola (padding, margens negativas...). */
  className?: string;
}

/**
 * Área com rolagem lateral cuja barra fica presa ao rodapé da tela enquanto a área está visível
 * (em vez de só aparecer no fim do conteúdo, como num quadro kanban com colunas compridas).
 * A barra nativa fica escondida; uma barra espelhada, sincronizada nos dois sentidos, faz o papel dela.
 */
export default function StickyHorizontalScroll({ children, className = "" }: StickyHorizontalScrollProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [overflowing, setOverflowing] = useState(false);

  // Mede a largura do conteúdo sempre que a área ou o conteúdo mudam de tamanho.
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const measure = () => {
      setScrollWidth(area.scrollWidth);
      setOverflowing(area.scrollWidth > area.clientWidth + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    Array.from(area.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [children]);

  // A barra aparece depois da medida: alinha a posição dela com a da área.
  useEffect(() => {
    if (overflowing && barRef.current && areaRef.current) barRef.current.scrollLeft = areaRef.current.scrollLeft;
  }, [overflowing, scrollWidth]);

  function follow(from: HTMLDivElement | null, to: HTMLDivElement | null) {
    if (!from || !to) return;
    // Evita o vaivém: a rolagem que a sincronização provoca não sincroniza de volta.
    if (syncing.current) {
      syncing.current = false;
      return;
    }
    if (Math.abs(to.scrollLeft - from.scrollLeft) < 1) return;
    syncing.current = true;
    to.scrollLeft = from.scrollLeft;
  }

  return (
    <div>
      <div
        ref={areaRef}
        className={`overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
        onScroll={() => follow(areaRef.current, barRef.current)}
      >
        {children}
      </div>
      {overflowing ? (
        <div
          ref={barRef}
          className="sticky-scrollbar sticky z-20 overflow-x-auto overflow-y-hidden"
          style={{ bottom: "env(safe-area-inset-bottom, 0px)" }}
          onScroll={() => follow(barRef.current, areaRef.current)}
          aria-hidden
        >
          <div style={{ width: scrollWidth, height: 1 }} />
        </div>
      ) : null}
    </div>
  );
}
