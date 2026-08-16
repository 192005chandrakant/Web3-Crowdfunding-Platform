import { useMemo } from "react";
import { motion } from "framer-motion";

interface BarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  showValues?: boolean;
}

export function BarChart({ data, color = "#10b981", height = 200, showValues = true }: BarChartProps) {
  const max = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);

  return (
    <div className="w-full flex items-end gap-2" style={{ height }}>
      {data.map((item, i) => {
        const h = `${(item.value / max) * 100}%`;
        return (
          <div key={i} className="relative flex-1 group flex flex-col justify-end h-full">
            {showValues && (
              <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-xs text-white px-2 py-1 rounded transition-opacity whitespace-nowrap z-10 pointer-events-none">
                {item.value}
              </div>
            )}
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: h }}
              transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
              className="w-full rounded-t-sm opacity-80 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: color }}
            />
            <div className="mt-2 text-center text-[10px] text-slate-500 uppercase tracking-wider truncate w-full" title={item.label}>
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
