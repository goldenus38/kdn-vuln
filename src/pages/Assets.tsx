import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, latestScanPerAsset } from '../lib/db'
import type { Asset, Scan } from '../types'
import { useToast } from '../contexts/ToastContext'
import { SAMPLE_ASSETS } from '../data/sampleAssets'
import { ScorePill, Spinner, EmptyState, fmtDate } from '../components/ui'

const EMPTY: Omit<Asset, 'id' | 'createdAt'> = {
  hostname: '', ip: '', osType: '', osVersion: '', department: '', owner: '', location: '', note: '',
}
const OS_OPTIONS = ['CentOS', 'Rocky', 'RHEL', 'Ubuntu', 'Debian', '기타']

export default function Assets() {
  const { notify } = useToast()
  const [assets, setAssets] = useState<Asset[]>([])
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<null | { id?: string; data: typeof EMPTY }>(null)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)

  async function load() {
    const [a, s] = await Promise.all([db.listAssets(), db.listScans()])
    setAssets(a); setScans(s); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const latestByAsset = useMemo(() => {
    const m = new Map<string, Scan>()
    for (const s of latestScanPerAsset(scans)) if (s.assetId) m.set(s.assetId, s)
    return m
  }, [scans])

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase()
    if (!k) return assets
    return assets.filter((a) =>
      [a.hostname, a.ip, a.osType, a.department, a.owner, a.location].some((v) => v.toLowerCase().includes(k)),
    )
  }, [assets, q])

  async function save() {
    if (!modal) return
    if (!modal.data.hostname.trim()) { notify('호스트명을 입력하세요.', 'error'); return }
    setSaving(true)
    try {
      if (modal.id) { await db.updateAsset(modal.id, modal.data); notify('자산을 수정했습니다.', 'success') }
      else { await db.createAsset(modal.data); notify('자산을 등록했습니다.', 'success') }
      setModal(null)
      await load()
    } catch (e) {
      notify(e instanceof Error ? e.message : '저장 실패', 'error')
    } finally { setSaving(false) }
  }

  async function seedSamples() {
    const existing = new Set(assets.map((a) => a.hostname.toLowerCase()))
    const toAdd = SAMPLE_ASSETS.filter((s) => !existing.has(s.hostname.toLowerCase()))
    if (toAdd.length === 0) { notify('샘플 자산이 이미 모두 등록되어 있습니다.', 'info'); return }
    setSeeding(true)
    try {
      for (const s of toAdd) await db.createAsset(s)
      notify(`샘플 자산 ${toAdd.length}대를 등록했습니다.`, 'success')
      await load()
    } catch (e) {
      notify(e instanceof Error ? e.message : '샘플 등록 실패', 'error')
    } finally { setSeeding(false) }
  }

  async function remove(a: Asset) {
    if (!confirm(`자산 '${a.hostname}' 을(를) 삭제할까요?`)) return
    await db.deleteAsset(a.id)
    notify('삭제되었습니다.', 'success')
    await load()
  }

  if (loading) return <Spinner />

  return (
    <>
      <div className="page-head">
        <div><h1>자산 관리</h1><div className="page-sub">점검 대상 Linux 서버 {assets.length}대</div></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={seedSamples} disabled={seeding} title={`샘플 서버 ${SAMPLE_ASSETS.length}대 일괄 등록 (테스트용)`}>
            <i className={`fa-solid ${seeding ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`} /> 샘플 자산 등록
          </button>
          <button className="btn btn-primary" onClick={() => setModal({ data: { ...EMPTY } })}>
            <i className="fa-solid fa-plus" /> 자산 등록
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input">
          <i className="fa-solid fa-magnifying-glass" />
          <input placeholder="호스트명·IP·부서·담당자 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon="fa-server">{assets.length === 0 ? '등록된 자산이 없습니다. 자산을 등록하세요.' : '검색 결과가 없습니다.'}</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>호스트명</th><th>IP</th><th>OS</th><th>부서</th><th>담당자</th>
                  <th>최근 점검</th><th className="col-center">취약</th><th>양호율</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const sc = latestByAsset.get(a.id)
                  return (
                    <tr key={a.id}>
                      <td className="mono" style={{ fontWeight: 600 }}>{a.hostname}</td>
                      <td className="mono">{a.ip || '-'}</td>
                      <td>{a.osType}{a.osVersion ? ` ${a.osVersion}` : ''}</td>
                      <td>{a.department || '-'}</td>
                      <td>{a.owner || '-'}</td>
                      <td>{sc ? fmtDate(sc.scanDate) : <span className="badge cat">미점검</span>}</td>
                      <td className="col-center" style={{ color: sc?.vulnCount ? 'var(--status-vuln)' : 'inherit', fontWeight: 700 }}>{sc ? sc.vulnCount : '-'}</td>
                      <td>{sc ? <ScorePill score={sc.score} /> : '-'}</td>
                      <td className="col-right" style={{ whiteSpace: 'nowrap' }}>
                        {sc && <Link to={`/scans/${sc.id}`} className="btn btn-secondary btn-sm" title="최근 점검 결과"><i className="fa-solid fa-eye" /></Link>}{' '}
                        <button className="btn btn-secondary btn-sm" onClick={() => setModal({ id: a.id, data: { hostname: a.hostname, ip: a.ip, osType: a.osType, osVersion: a.osVersion, department: a.department, owner: a.owner, location: a.location, note: a.note } })}><i className="fa-solid fa-pen" /></button>{' '}
                        <button className="btn btn-secondary btn-sm" onClick={() => remove(a)}><i className="fa-solid fa-trash" /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{modal.id ? '자산 수정' : '자산 등록'}</h2>
              <button className="icon-btn" onClick={() => setModal(null)}><i className="fa-solid fa-xmark" /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-row">
                  <div className="field"><label>호스트명 *</label><input value={modal.data.hostname} onChange={(e) => setModal({ ...modal, data: { ...modal.data, hostname: e.target.value } })} placeholder="web-prod-01" /></div>
                  <div className="field"><label>IP 주소</label><input value={modal.data.ip} onChange={(e) => setModal({ ...modal, data: { ...modal.data, ip: e.target.value } })} placeholder="10.0.0.10" /></div>
                </div>
                <div className="form-row">
                  <div className="field"><label>OS</label>
                    <select value={modal.data.osType} onChange={(e) => setModal({ ...modal, data: { ...modal.data, osType: e.target.value } })}>
                      <option value="">선택</option>
                      {OS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>OS 버전</label><input value={modal.data.osVersion} onChange={(e) => setModal({ ...modal, data: { ...modal.data, osVersion: e.target.value } })} placeholder="8.10" /></div>
                </div>
                <div className="form-row">
                  <div className="field"><label>부서/소속</label><input value={modal.data.department} onChange={(e) => setModal({ ...modal, data: { ...modal.data, department: e.target.value } })} /></div>
                  <div className="field"><label>담당자</label><input value={modal.data.owner} onChange={(e) => setModal({ ...modal, data: { ...modal.data, owner: e.target.value } })} /></div>
                </div>
                <div className="field"><label>위치/구역</label><input value={modal.data.location} onChange={(e) => setModal({ ...modal, data: { ...modal.data, location: e.target.value } })} placeholder="본관 IDC A-12" /></div>
                <div className="field"><label>비고</label><textarea rows={2} value={modal.data.note} onChange={(e) => setModal({ ...modal, data: { ...modal.data, note: e.target.value } })} /></div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>취소</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
