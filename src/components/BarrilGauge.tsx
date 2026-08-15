"use client";

/**
 * Indicador de estoque em formato de barril — o elemento visual
 * assinatura do painel. O preenchimento representa o nível de
 * estoque atual em relação a `max` (normalmente o maior estoque
 * entre os produtos, para comparação relativa).
 */
export default function BarrilGauge({
  quantidade,
  max,
  baixo,
  color,
  height = 96,
}: {
  quantidade: number;
  max: number;
  baixo: boolean;
  color: string;
  height?: number;
}) {
  const pct = max > 0 ? Math.min(quantidade / max, 1) : 0;
  const fillColor = baixo ? "var(--danger)" : color;
  const clipId = `barril-clip-${Math.round(quantidade * 997 + max)}-${height}`;

  return (
    <div className="flex flex-col items-center gap-2" style={{ width: 46 }}>
      <div style={{ height, width: 40 }} className="relative">
        <svg viewBox="0 0 40 96" width="40" height={height} className="absolute inset-0">
          <defs>
            <clipPath id={clipId}>
              <path d="M4 6 Q4 2 20 2 Q36 2 36 6 L36 88 Q36 94 20 94 Q4 94 4 88 Z" />
            </clipPath>
          </defs>
          {/* contorno do barril */}
          <path
            d="M4 6 Q4 2 20 2 Q36 2 36 6 L36 88 Q36 94 20 94 Q4 94 4 88 Z"
            fill="var(--bg-elevated)"
            stroke="var(--border)"
            strokeWidth="1.5"
          />
          {/* nível de preenchimento */}
          <g clipPath={`url(#${clipId})`}>
            <rect
              x="4"
              y={94 - pct * 92}
              width="32"
              height={pct * 92}
              fill={fillColor}
              opacity={0.85}
            />
          </g>
          {/* aros do barril */}
          <path d="M4 28h32M4 68h32" stroke="var(--bg)" strokeWidth="1.3" opacity="0.5" />
        </svg>
      </div>
      <span
        className="font-[family-name:var(--font-mono)] text-sm tabular-nums"
        style={{ color: baixo ? "var(--danger)" : "var(--text)" }}
      >
        {quantidade}
      </span>
    </div>
  );
}
