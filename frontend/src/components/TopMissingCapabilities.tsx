import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import type { SkillStat } from '../hooks/useStats';

interface Props {
  skills: SkillStat[];
}

// Dark styling scheme matching the new Bento grid
const BAR_COLOR = '#111111';

function trimLabel(s: string) {
  return s.length > 45 ? s.slice(0, 42) + '…' : s;
}

function Tip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { skill, count } = payload[0].payload;
  return (
    <div
      style={{
        background: '#111',
        color: '#fff',
        borderRadius: 8,
        padding: '8px 12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 500, marginBottom: 3 }}>
        {skill}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--bento-yellow)' }}>
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
      fill="rgba(0,0,0,0.6)"
    >
      {value}
    </text>
  );
}

export default function TopMissingCapabilities({ skills }: Props) {
  const data = skills.slice(0, 14); // show more items for denser layout

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Title */}
      <div style={{ marginBottom: 16 }}>
        <span className="sys-label solid" style={{ padding: '6px 16px', background: 'rgba(0,0,0,0.08)' }}>
          TOP MISSING CAPABILITIES
        </span>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 0, marginLeft: -16 }}>
        {data.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="sys-label" style={{ color: 'rgba(0,0,0,0.5)' }}>Awaiting data…</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 32, left: 0, bottom: 0 }}
              barSize={6}
              barCategoryGap="15%"
            >
              <XAxis type="number" hide domain={[0, (m: number) => Math.ceil(m * 1.2)]} />
              <YAxis
                type="category" dataKey="skill"
                width={280} interval={0}
                tickFormatter={trimLabel}
                tick={{ fill: 'rgba(0,0,0,0.7)', fontSize: 11, fontFamily: 'var(--font-display)' }}
                tickLine={false} axisLine={false}
              />
              <Tooltip content={<Tip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
              <Bar dataKey="count" radius={4} label={<CountLabel />}>
                {data.map((e) => (
                  <Cell key={e.skill} fill={BAR_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
