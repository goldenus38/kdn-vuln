import type { CveSeverity, Threat } from '../types'

const SEVS: CveSeverity[] = ['긴급', '높음', '중간', '낮음']
const SOURCES = ['KISA', 'KrCERT/CC', 'NVD', 'MITRE', '벤더 권고', '기타']

export interface ThreatDraft {
  title: string
  cve: string
  severity: CveSeverity
  source: string
  sourceUrl: string
  publishedDate: string
  tagsText: string       // 콤마 구분 입력
  itemsText: string      // 콤마 구분 U-코드 입력
  body: string
  author: string
}

export function emptyThreatDraft(): ThreatDraft {
  return { title: '', cve: '', severity: '중간', source: 'KISA', sourceUrl: '', publishedDate: '', tagsText: '', itemsText: '', body: '', author: '보안관제팀' }
}
export function threatDraftFrom(t: Threat): ThreatDraft {
  return {
    title: t.title, cve: t.cve, severity: t.severity, source: t.source, sourceUrl: t.sourceUrl,
    publishedDate: t.publishedDate, tagsText: t.tags.join(', '), itemsText: t.relatedItems.join(', '),
    body: t.body, author: t.author,
  }
}
/** 콤마 텍스트 → 배열 */
export function splitCsv(s: string): string[] {
  return s.split(',').map((x) => x.trim()).filter(Boolean)
}

export default function ThreatModal({
  mode, draft, onChange, onClose, onSave, saving,
}: {
  mode: 'create' | 'edit'
  draft: ThreatDraft
  onChange: (d: ThreatDraft) => void
  onClose: () => void
  onSave: () => void
  saving: boolean
}) {
  const set = (p: Partial<ThreatDraft>) => onChange({ ...draft, ...p })
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 660 }}>
        <div className="modal-head">
          <h2>{mode === 'create' ? '보안 동향 등록' : '보안 동향 수정'}</h2>
          <button className="icon-btn" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="field"><label>제목 *</label>
              <input value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="예: OpenSSH 원격코드실행 취약점" />
            </div>
            <div className="form-row">
              <div className="field"><label>CVE 번호</label>
                <input value={draft.cve} onChange={(e) => set({ cve: e.target.value })} placeholder="CVE-2026-1234" />
              </div>
              <div className="field"><label>심각도</label>
                <select value={draft.severity} onChange={(e) => set({ severity: e.target.value as CveSeverity })}>
                  {SEVS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="field"><label>출처</label>
                <select value={draft.source} onChange={(e) => set({ source: e.target.value })}>
                  {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field"><label>발표일</label>
                <input type="date" value={draft.publishedDate} onChange={(e) => set({ publishedDate: e.target.value })} />
              </div>
            </div>
            <div className="field"><label>출처 링크</label>
              <input value={draft.sourceUrl} onChange={(e) => set({ sourceUrl: e.target.value })} placeholder="https://knvd.krcert.or.kr/..." />
            </div>
            <div className="form-row">
              <div className="field"><label>태그 (콤마 구분)</label>
                <input value={draft.tagsText} onChange={(e) => set({ tagsText: e.target.value })} placeholder="OpenSSH, RCE, 원격" />
              </div>
              <div className="field"><label>관련 점검항목 (콤마)</label>
                <input value={draft.itemsText} onChange={(e) => set({ itemsText: e.target.value })} placeholder="U-01, U-52" />
              </div>
            </div>
            <div className="field"><label>작성자</label>
              <input value={draft.author} onChange={(e) => set({ author: e.target.value })} />
            </div>
            <div className="field"><label>내용</label>
              <textarea rows={7} value={draft.body} onChange={(e) => set({ body: e.target.value })} placeholder="취약점 개요·영향·대응 방안" />
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
        </div>
      </div>
    </div>
  )
}
