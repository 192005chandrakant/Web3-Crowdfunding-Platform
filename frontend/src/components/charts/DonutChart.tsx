import { motion } from "framer-motion";

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  showLegend?: boolean;
}

export function DonutChart({ data, size = 200, showLegend = true }: DonutChartProps) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0) || 1;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          {data.map((item, i) => {
            const strokeLength = (item.value / total) * circumference;
            const offset = currentOffset;
            currentOffset += strokeLength;

            return (
              <motion.circle
                key={i}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth="16"
                strokeDasharray={`${strokeLength} ${circumference}`}
                strokeDashoffset={-offset}
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{ strokeDasharray: `${strokeLength} ${circumference}` }}
                transition={{ duration: 1, delay: i * 0.1, ease: "easeInOut" }}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
            );
          })}
        </svg>
      </div>

      {showLegend && (
        <div className="flex flex-wrap justify-center gap-4">
          {data.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-slate-300">{item.label}</span>
              <span className="text-slate-500 font-mono">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
