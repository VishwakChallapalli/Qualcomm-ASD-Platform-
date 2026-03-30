'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';

export interface Session {
  date: string;
  timePlayed: number;
  emotionTime: Record<string, number>;
}

interface EmotionLineChartProps {
  sessions: Session[];
}

const EMOTION_CONFIG = [
  { key: 'happy', label: 'Happy', color: '#fbbf24' },
  { key: 'neutral', label: 'Neutral', color: '#94a3b8' },
  { key: 'sad', label: 'Sad', color: '#60a5fa' },
  { key: 'angry', label: 'Angry', color: '#f87171' },
  { key: 'surprised', label: 'Surprised', color: '#fb923c' },
  { key: 'fearful', label: 'Fearful', color: '#a78bfa' },
  { key: 'disgusted', label: 'Disgusted', color: '#4ade80' },
];

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function tooltipFormatter(value: ValueType | undefined, name: NameType | undefined): [string, string] {
  const cfg = EMOTION_CONFIG.find(e => e.key === name);
  return [formatTime(typeof value === 'number' ? value : 0), cfg?.label ?? String(name ?? '')];
}

function legendFormatter(value: string): string {
  const cfg = EMOTION_CONFIG.find(e => e.key === value);
  return cfg?.label ?? value;
}

export default function EmotionLineChart({ sessions }: EmotionLineChartProps) {
  type DataPoint = Record<string, string | number>;
  const data: DataPoint[] = sessions.map((s, i) => {
    const point: DataPoint = { name: `Session ${i + 1}` };
    for (const e of EMOTION_CONFIG) {
      point[e.key] = s.emotionTime?.[e.key] ?? 0;
    }
    return point;
  });

  // Emotions that have at least one non-zero value across all sessions
  const presentEmotions = EMOTION_CONFIG.filter(e =>
    data.some(d => (d[e.key] as number) > 0)
  );

  // Track which emotions are explicitly hidden; neutral hidden by default
  const [disabled, setDisabled] = useState<Set<string>>(() => new Set(['neutral']));

  function toggleEmotion(key: string) {
    setDisabled(prev => {
      const visibleCount = presentEmotions.filter(e => !prev.has(e.key)).length;
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        // Keep at least one visible
        if (visibleCount > 1) next.add(key);
      }
      return next;
    });
  }

  if (sessions.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '200px',
        color: '#9ca3af',
        fontSize: '0.9rem',
        fontStyle: 'italic',
      }}>
        No session data yet — play this game to see trends
      </div>
    );
  }

  const visibleEmotions = presentEmotions.filter(e => !disabled.has(e.key));

  return (
    <div>
      {/* Emotion toggle pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
        {presentEmotions.map(e => {
          const on = !disabled.has(e.key);
          return (
            <button
              key={e.key}
              onClick={() => toggleEmotion(e.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.3rem 0.75rem',
                borderRadius: '999px',
                border: `2px solid ${e.color}`,
                background: on ? e.color : 'transparent',
                color: on ? '#fff' : e.color,
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: presentEmotions.length === 1 || (on && visibleEmotions.length === 1) ? 'default' : 'pointer',
                opacity: presentEmotions.length === 1 || (on && visibleEmotions.length === 1) ? 0.6 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              {EMOTION_CONFIG.find(cfg => cfg.key === e.key)?.label}
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e9f2" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e4e9f2' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatTime(v)}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            width={46}
          />
          <Tooltip
            formatter={tooltipFormatter}
            labelFormatter={(label) => {
              const idx = parseInt(String(label).replace('Session ', '')) - 1;
              const session = sessions[idx];
              if (!session) return label;
              const date = new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              return `${label} · ${date}`;
            }}
            contentStyle={{
              background: '#ffffff',
              border: '1px solid #e4e9f2',
              borderRadius: '8px',
              fontSize: '0.8rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '0.78rem', paddingTop: '8px' }}
            formatter={legendFormatter}
          />
          {visibleEmotions.map(e => (
            <Line
              key={e.key}
              type="linear"
              dataKey={e.key}
              stroke={e.color}
              strokeWidth={2.5}
              dot={{ r: 6, fill: e.color, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 9, strokeWidth: 2, stroke: '#fff' }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
