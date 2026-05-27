import type { CheckResult, FixResult, Severity } from '../types'

const RESULT_LABEL: Record<CheckResult, string> = { Y: '양호', N: '취약', C: '수동확인' }
const RESULT_ICON: Record<CheckResult, string> = {
  Y: 'fa-circle-check', N: 'fa-circle-exclamation', C: 'fa-circle-question',
}

export function ResultBadge({ result }: { result: CheckResult }) {
  return (
    <span className={`badge result-${result}`}>
      <i className={`fa-solid ${RESULT_ICON[result]}`} />
      {RESULT_LABEL[result]}
    </span>
  )
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`badge sev-${severity}`}>{severity}</span>
}

const FIX_LABEL: Record<FixResult, string> = {
  FIXED: '조치완료', REPORTED: '보고', MANUAL: '수동조치', FAIL: '실패', UNKNOWN: '기타',
}
const FIX_ICON: Record<FixResult, string> = {
  FIXED: 'fa-circle-check', REPORTED: 'fa-clipboard-list', MANUAL: 'fa-hand',
  FAIL: 'fa-circle-xmark', UNKNOWN: 'fa-circle-minus',
}
export function FixBadge({ result }: { result: FixResult }) {
  return (
    <span className={`badge fix-${result}`}>
      <i className={`fa-solid ${FIX_ICON[result]}`} />
      {FIX_LABEL[result]}
    </span>
  )
}

/** 양호율 점수 표시 (높을수록 좋음) */
export function ScorePill({ score }: { score: number }) {
  const cls = score >= 90 ? 'score-good' : score >= 70 ? 'score-warn' : 'score-bad'
  return (
    <span className={`score-pill ${cls}`}>
      {score}
      <span className="pct">%</span>
    </span>
  )
}

export function Progress({ value }: { value: number }) {
  const cls = value >= 90 ? 'good' : value >= 70 ? 'warn' : 'bad'
  return (
    <div className="progress" title={`${value}%`}>
      <span className={cls} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function EmptyState({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="empty-state">
      <div><i className={`fa-solid ${icon}`} /></div>
      <p>{children}</p>
    </div>
  )
}

export function Spinner() {
  return <div className="center-loading"><div className="loading-spinner" /></div>
}

/** ISO/문자열 일시를 'YYYY-MM-DD HH:MM' 으로 */
export function fmtDate(s: string): string {
  if (!s) return '-'
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
