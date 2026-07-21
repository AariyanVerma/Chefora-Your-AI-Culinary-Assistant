"use client";

import { useEffect, useState, useRef } from "react";

export function usePackedPills() {
  const containerRef = useRef<HTMLUListElement | null>(null);
  const [orders, setOrders] = useState<number[]>([]);

  const pack = () => {
    const container = containerRef.current;
    if (!container) return;

    const items = Array.from(container.children) as HTMLElement[];

    const widths = items.map((el) => el.offsetWidth + 16); 

    const totalWidth = container.offsetWidth;
    let currentRowWidth = 0;
    let row: number[] = [];
    const rows: number[][] = [];

    widths.forEach((w, i) => {
      if (currentRowWidth + w > totalWidth) {
        rows.push(row);
        row = [];
        currentRowWidth = 0;
      }
      row.push(i);
      currentRowWidth += w;
    });

    if (row.length) rows.push(row);

    const newOrder = rows.flat();
    setOrders(newOrder);
  };

  useEffect(() => {
    pack();
    window.addEventListener("resize", pack);
    return () => window.removeEventListener("resize", pack);
  }, []);

  return { containerRef, orders };
}
