// 의존성 없는 경량 SVG 라인 차트
export interface TrendPoint { label: string; value: number }

export function TrendChart({
  data, unit = '', yMax, color = 'var(--kdn-red)', height = 170, area = true,
}: {
  data: TrendPoint[]
  unit?: string
  yMax?: number
  color?: string
  height?: number
  area?: boolean
}) {
  if (data.length === 0) {
    return <div className="empty-state" style={{ padding: 30 }}><p>표시할 추이 데이터가 없습니다.</p></div>
  }

  const W = 640, H = height
  const padL = 38, padR = 14, padT = 14, padB = 30
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const max = yMax ?? Math.max(1, ...data.map((d) => d.value)) * 1.15
  const n = data.length

  const x = (i: number) => (n <= 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW)
  const y = (v: number) => padT + innerH - (Math.min(v, max) / max) * innerH

  const ptStr = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ')
  const areaStr = `${padL},${padT + innerH} ${ptStr} ${x(n - 1)},${padT + innerH}`
  const grid = [0, 0.5, 1].map((f) => ({ v: max * f, gy: padT + innerH - f * innerH }))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }} role="img">
      {grid.map((g, i) => (
        <g key={i}>
          <line x1={padL} y1={g.gy} x2={W - padR} y2={g.gy} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
          <text x={padL - 6} y={g.gy + 3} textAnchor="end" fontSize="10" fill="var(--text-light)">
            {Math.round(g.v)}{unit}
          </text>
        </g>
      ))}
      {area && n > 1 && (
        <polygon points={areaStr} fill={color} opacity="0.08" />
      )}
      {n > 1 && <polyline points={ptStr} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.value)} r="3.5" fill={color} stroke="var(--surface)" strokeWidth="1.5" />
          <text x={x(i)} y={y(d.value) - 9} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="var(--text-primary)">
            {d.value}{unit}
          </text>
          <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="var(--text-light)">{d.label}</text>
        </g>
      ))}
    </svg>
  )
}
