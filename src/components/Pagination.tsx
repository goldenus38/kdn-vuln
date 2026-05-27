// 간단 페이지네이션 (윈도우 + 처음/이전/다음/끝)
export default function Pagination({
  page, totalPages, onChange,
}: {
  page: number
  totalPages: number
  onChange: (p: number) => void
}) {
  if (totalPages <= 1) return null

  const win = 5
  let start = Math.max(1, page - Math.floor(win / 2))
  const end = Math.min(totalPages, start + win - 1)
  start = Math.max(1, end - win + 1)
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)

  const go = (p: number) => onChange(Math.min(totalPages, Math.max(1, p)))

  return (
    <nav className="pagination" aria-label="페이지">
      <button className="pg-btn" disabled={page === 1} onClick={() => go(1)} aria-label="처음"><i className="fa-solid fa-angles-left" /></button>
      <button className="pg-btn" disabled={page === 1} onClick={() => go(page - 1)} aria-label="이전"><i className="fa-solid fa-angle-left" /></button>
      {pages.map((p) => (
        <button key={p} className={`pg-btn ${p === page ? 'active' : ''}`} onClick={() => go(p)}>{p}</button>
      ))}
      <button className="pg-btn" disabled={page === totalPages} onClick={() => go(page + 1)} aria-label="다음"><i className="fa-solid fa-angle-right" /></button>
      <button className="pg-btn" disabled={page === totalPages} onClick={() => go(totalPages)} aria-label="끝"><i className="fa-solid fa-angles-right" /></button>
    </nav>
  )
}
