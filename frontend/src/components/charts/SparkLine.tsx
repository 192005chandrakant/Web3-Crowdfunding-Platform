import { useMemo } from "react";
import { motion } from "framer-motion";

interface SparkLineProps {
  data: number[];
  color?: string;
  width?: number | string;
  height?: number;
}

export function SparkLine({ data, color = "#3b82f6", width = "100%", height = 60 }: SparkLineProps) {
  const max = useMemo(() => Math.max(...data, 1), [data]);
  const min = useMemo(() => Math.min(...data, 0), [data]);
  const range = max - min;

  const points = useMemo(() => {
    if (data.length === 0) return "";
    const step = 100 / (data.length - 1 || 1);
    return data
      .map((val, i) => {
        const x = i * step;
        const y = 100 - ((val - min) / (range || 1)) * 100;
        return `${x},${y}`;
      })
      .join(" ");
  }, [data, max, min, range]);

  return (
    <div style={{ width, height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <motion.polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
}
