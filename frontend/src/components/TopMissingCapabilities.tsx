import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import type { SkillStat } from '../hooks/useStats';

interface Props {
  skills: SkillStat[];
  byCategory: Record<string, number>;
}

// Monochrome-first palette — dark shades, no neon
const COLORS = [
  '#111111', '#444444', '#222222', '#555555',
  '#333333', '#666666', '#1a1a1a', '#4a4a4a',
];
const COLOR_MAP: Record<string, string> = {};
function getColor(skill: string, idx: number) {
  if (!COLOR_MAP[skill]) COLOR_MAP[skill] = COLORS[idx % COLORS.length];
  return COLOR_MAP[skill];
}
function trimLabel(s: string) {
  return s.length > 34 ? s.slice(0, 31) + '…' : s;
}

function Tip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { skill, count } = payload[0].payload;
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 2,
        padding: '8px 12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, marginBottom: 3 }}>
        {skill}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--red)' }}>
        {count} failed jobs
      </div>
    </div>
  );
}

function CountLabel(props: any) {
  const { x, y, width, height, value } = props;
  if (!width || width <= 0) return null;
  return (
    <text
      x={x + width + 8} y={y + height / 2 + 1}
      textAnchor="start" dominantBaseline="middle"
      fontSize={10} fontFamily="IBM Plex Mono, monospace"
      fill="var(--ink-4)"
    >
      {value}
    </text>
  );
}

export default function TopMissingCapabilities({ skills, byCategory }: Props) {
  const data = skills.slice(0, 15);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Sub-header: category legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <span className="body-text" style={{ fontSize: 13 }}>
          {skills.length} distinct capability gaps tracked
        </span>
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { label: 'DeFi',    key: 'DeFi' },
            { label: 'Security',key: 'Security' },
            { label: 'Data',    key: 'Data-Parsing' },
            { label: 'Infra',   key: 'Infrastructure' },
          ].map(({ label, key }) => {
            const total = Object.values(byCategory).reduce((s, v) => s + v, 0) || 1;
            const pct = (((byCategory[key] ?? 0) / total) * 100).toFixed(0);
            return (
              <div key={key} style={{ textAlign: 'right' }}>
                <div className="sys-label">{label}</div>
                <div
                  className="mono-val"
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}
                >
                  {pct}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {data.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="sys-label">Awaiting data from blockchain…</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
              barSize={9}
              barCategoryGap="20%"
            >
              <XAxis type="number" hide domain={[0, (m: number) => Math.ceil(m * 1.2)]} />
              <YAxis
                type="category" dataKey="skill"
                width={240} interval={0}
                tickFormatter={trimLabel}
                tick={{ fill: 'var(--ink-3)', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}
                tickLine={false} axisLine={false}
              />
              <Tooltip content={<Tip />} cursor={{ fill: 'rgba(0,0,0,0.025)' }} />
              <Bar dataKey="count" radius={[0, 2, 2, 0]} label={<CountLabel />}>
                {data.map((e, i) => (
                  <Cell key={e.skill} fill={getColor(e.skill, i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
