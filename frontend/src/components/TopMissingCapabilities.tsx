import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { SkillStat } from '../hooks/useStats';

interface Props {
  skills: SkillStat[];
  byCategory: Record<string, number>;
}

const CATEGORY_COLORS: Record<string, string> = {
  DeFi: '#7c3aed',
  Security: '#dc2626',
  'Data-Parsing': '#0891b2',
  Infrastructure: '#d97706',
};

const SKILL_COLOR_MAP: Record<string, string> = {};
const COLORS = ['#7c3aed', '#0891b2', '#dc2626', '#d97706', '#16a34a', '#db2777', '#2563eb', '#9333ea'];

function getSkillColor(skill: string): string {
  if (!SKILL_COLOR_MAP[skill]) {
    const idx = Object.keys(SKILL_COLOR_MAP).length % COLORS.length;
    SKILL_COLOR_MAP[skill] = COLORS[idx];
  }
  return SKILL_COLOR_MAP[skill];
}

// Truncate excessively long skill names for the axis labels
function formatSkillLabel(skill: string): string {
  if (skill.length > 28) {
    return skill.slice(0, 25) + '...';
  }
  return skill;
}

// Custom tooltip
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-bg-tertiary border border-border-default rounded-sm px-3 py-2 font-mono text-xs shadow-xl">
      <div className="text-text-primary font-medium">{item.payload.skill}</div>
      <div className="text-status-green mt-0.5">{item.value} jobs failed</div>
    </div>
  );
}

export default function TopMissingCapabilities({ skills, byCategory }: Props) {
  const chartData = skills.slice(0, 12);
  const totalJobs = Object.values(byCategory).reduce((s, v) => s + v, 0);

  return (
    <div className="card h-full flex flex-col">
      <div className="card-header">
        <span className="card-label">Top Missing Capabilities</span>
        <span className="text-xs font-mono text-text-muted">{skills.length} skills tracked</span>
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-4 gap-0 border-b border-border-subtle">
        {['DeFi', 'Security', 'Data-Parsing', 'Infrastructure'].map((cat) => {
          const count = byCategory[cat] ?? 0;
          const pct = totalJobs > 0 ? ((count / totalJobs) * 100).toFixed(0) : '0';
          return (
            <div
              key={cat}
              className="flex flex-col items-center py-3 border-r border-border-subtle last:border-r-0"
            >
              <div
                className="text-xs font-mono font-semibold tabular-nums"
                style={{ color: CATEGORY_COLORS[cat] }}
              >
                {pct}%
              </div>
              <div className="text-xs font-mono text-text-muted mt-0.5 truncate px-1">
                {cat === 'Data-Parsing' ? 'Data' : cat}
              </div>
              <div
                className="w-full h-0.5 mt-2 mx-4"
                style={{
                  background: `linear-gradient(90deg, ${CATEGORY_COLORS[cat]} ${pct}%, transparent ${pct}%)`,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Bar chart */}
      <div className="flex-1 px-2 py-3 min-h-0">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <span className="font-mono text-xs text-text-muted animate-pulse">
              Awaiting data from blockchain...
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              barSize={10}
            >
              <XAxis
                type="number"
                hide
                domain={[0, (max: number) => Math.ceil(max * 1.15)]}
              />
              <YAxis
                type="category"
                dataKey="skill"
                width={210}
                interval={0}
                tickFormatter={formatSkillLabel}
                tick={{
                  fill: '#8b9ab0',
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" radius={[0, 2, 2, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.skill} fill={getSkillColor(entry.skill)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
