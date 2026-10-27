import * as React from "react";

import { type Candle, candles, sparkline } from "@/lib/crypto-exchange/markets";

const UP = "#16C784";
const DOWN = "#EF4F5E";

/** A market's 24 h line, green or red with its change. */
export function Sparkline({
  symbol,
  change,
  width = 90,
  height = 30,
}: {
  symbol: string;
  change: number;
  width?: number;
  height?: number;
}) {
  const values = sparkline(symbol, change);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map(
      (value, index) =>
        `${((index / (values.length - 1)) * width).toFixed(1)},${(height - 2 - ((value - min) / span) * (height - 4)).toFixed(1)}`,
    )
    .join(" ");

  return (
    <svg
      aria-hidden
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <polyline
        fill="none"
        points={points}
        stroke={change >= 0 ? UP : DOWN}
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

/** The portfolio line on a phone. */
export function AreaLine({ symbol }: { symbol: string }) {
  return (
    <svg aria-hidden preserveAspectRatio="none" viewBox="0 0 360 110">
      <polyline
        fill="none"
        points={sparkline(symbol, 3, 24)
          .map((value, index, all) => {
            const min = Math.min(...all);
            const span = Math.max(...all) - min || 1;

            return `${((index / (all.length - 1)) * 360).toFixed(1)},${(104 - ((value - min) / span) * 98).toFixed(1)}`;
          })
          .join(" ")}
        stroke={UP}
        strokeLinejoin="round"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** BTC/EUR candles, the last-price line, the axis and the volume bars. */
export function CandleChart() {
  const series: Candle[] = React.useMemo(() => candles(), []);
  const width = 1000;
  const height = 420;
  const priceArea = 300;
  const axis = 70;
  const high = Math.max(...series.map((candle) => candle.high));
  const low = Math.min(...series.map((candle) => candle.low));
  const y = (price: number) =>
    14 + ((high - price) / (high - low)) * (priceArea - 28);
  const step = (width - axis) / series.length;
  const last = series[series.length - 1].close;
  const ticks = [0.15, 0.4, 0.65, 0.9].map(
    (share) => high - (high - low) * share,
  );

  return (
    <svg
      aria-hidden
      preserveAspectRatio="none"
      viewBox={`0 0 ${width} ${height}`}
    >
      {ticks.map((price) => (
        <g key={price}>
          <line
            stroke="#1B2530"
            x1="0"
            x2={width - axis}
            y1={y(price)}
            y2={y(price)}
          />
          <text
            fill="#56677A"
            fontFamily="var(--font-ks-mono), monospace"
            fontSize="12"
            x={width - axis + 10}
            y={y(price) + 4}
          >
            {Math.round(price).toLocaleString("en-US")}
          </text>
        </g>
      ))}
      <line
        stroke="#1CC8B4"
        strokeDasharray="4 4"
        x1="0"
        x2={width - axis}
        y1={y(last)}
        y2={y(last)}
      />
      {series.map((candle, index) => {
        const up = candle.close >= candle.open;
        const x = index * step + step / 2;
        const top = y(Math.max(candle.open, candle.close));
        const bottom = y(Math.min(candle.open, candle.close));
        const color = up ? UP : DOWN;

        return (
          <g key={index}>
            <line
              stroke={color}
              x1={x}
              x2={x}
              y1={y(candle.high)}
              y2={y(candle.low)}
            />
            <rect
              fill={color}
              height={Math.max(1.5, bottom - top)}
              width={step * 0.62}
              x={x - step * 0.31}
              y={top}
            />
            <rect
              fill={color}
              height={candle.volume * (height - priceArea - 24)}
              opacity="0.35"
              width={step * 0.62}
              x={x - step * 0.31}
              y={height - candle.volume * (height - priceArea - 24)}
            />
          </g>
        );
      })}
    </svg>
  );
}
