// ============================================
// 데이터 레이어
// Supabase 모드(env 설정 시) ↔ localStorage 폴백 모드를 동일한 API 로 추상화.
// 호스팅 확정 후 .env 채우고 supabase/schema.sql 적용하면 자동으로 Supabase 사용.
// ============================================

import type { Asset, FixRun, Notice, Resource, Scan, Threat } from '../types'
import { supabase, isSupabaseMode } from './supabase'

const LS_ASSETS = 'kdnvuln_assets'
const LS_SCANS = 'kdnvuln_scans'
const LS_FIXES = 'kdnvuln_fixes'
const LS_NOTICES = 'kdnvuln_notices'
const LS_THREATS = 'kdnvuln_threats'
const LS_RESOURCES = 'kdnvuln_resources'
const RESOURCE_BUCKET = 'resources'

function uid(): string {
  return (crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`)
}

function lsRead<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]') as T[]
  } catch {
    return []
  }
}
function lsWrite<T>(key: string, val: T[]): void {
  localStorage.setItem(key, JSON.stringify(val))
}

// ── Supabase row <-> 도메인 매핑 ──
/* eslint-disable @typescript-eslint/no-explicit-any */
function assetFromRow(r: any): Asset {
  return {
    id: r.id, hostname: r.hostname, ip: r.ip ?? '', osType: r.os_type ?? '',
    osVersion: r.os_version ?? '', department: r.department ?? '', owner: r.owner ?? '',
    location: r.location ?? '', note: r.note ?? '', createdAt: r.created_at,
  }
}
function assetToRow(a: Partial<Asset>) {
  return {
    hostname: a.hostname, ip: a.ip, os_type: a.osType, os_version: a.osVersion,
    department: a.department, owner: a.owner, location: a.location, note: a.note,
  }
}
function scanFromRow(r: any): Scan {
  return {
    id: r.id, assetId: r.asset_id, hostname: r.hostname, scanDate: r.scan_date,
    fileName: r.file_name, uploadedAt: r.uploaded_at, uploadedBy: r.uploaded_by ?? '',
    total: r.total, vulnCount: r.vuln_count, goodCount: r.good_count,
    manualCount: r.manual_count, score: r.score, results: r.results ?? [],
  }
}
function scanToRow(s: Scan) {
  return {
    id: s.id, asset_id: s.assetId, hostname: s.hostname, scan_date: s.scanDate,
    file_name: s.fileName, uploaded_at: s.uploadedAt, uploaded_by: s.uploadedBy,
    total: s.total, vuln_count: s.vulnCount, good_count: s.goodCount,
    manual_count: s.manualCount, score: s.score, results: s.results,
  }
}
function fixFromRow(r: any): FixRun {
  return {
    id: r.id, assetId: r.asset_id, hostname: r.hostname, fixDate: r.fix_date,
    fileName: r.file_name, uploadedAt: r.uploaded_at, itemsArg: r.items_arg ?? '',
    total: r.total, fixedCount: r.fixed_count, reportedCount: r.reported_count,
    manualCount: r.manual_count, failCount: r.fail_count, items: r.items ?? [],
  }
}
function fixToRow(f: FixRun) {
  return {
    id: f.id, asset_id: f.assetId, hostname: f.hostname, fix_date: f.fixDate,
    file_name: f.fileName, uploaded_at: f.uploadedAt, items_arg: f.itemsArg,
    total: f.total, fixed_count: f.fixedCount, reported_count: f.reportedCount,
    manual_count: f.manualCount, fail_count: f.failCount, items: f.items,
  }
}
function noticeFromRow(r: any): Notice {
  return {
    id: r.id, category: r.category, title: r.title, body: r.body ?? '',
    author: r.author ?? '', pinned: !!r.pinned, views: r.views ?? 0,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }
}
function noticeToRow(n: Partial<Notice>) {
  return {
    category: n.category, title: n.title, body: n.body, author: n.author,
    pinned: n.pinned, updated_at: new Date().toISOString(),
  }
}
function threatFromRow(r: any): Threat {
  return {
    id: r.id, title: r.title, cve: r.cve ?? '', severity: r.severity,
    source: r.source ?? '', sourceUrl: r.source_url ?? '', publishedDate: r.published_date ?? '',
    tags: r.tags ?? [], relatedItems: r.related_items ?? [], body: r.body ?? '',
    author: r.author ?? '', views: r.views ?? 0, createdAt: r.created_at, updatedAt: r.updated_at,
  }
}
function threatToRow(t: Partial<Threat>) {
  return {
    title: t.title, cve: t.cve, severity: t.severity, source: t.source, source_url: t.sourceUrl,
    published_date: t.publishedDate, tags: t.tags, related_items: t.relatedItems,
    body: t.body, author: t.author, updated_at: new Date().toISOString(),
  }
}
function resourceFromRow(r: any): Resource {
  return {
    id: r.id, category: r.category, title: r.title, description: r.description ?? '',
    fileName: r.file_name ?? '', filePath: r.file_path ?? '', fileUrl: r.file_url ?? '',
    fileSize: r.file_size ?? 0, mime: r.mime ?? '', author: r.author ?? '',
    downloads: r.downloads ?? 0, createdAt: r.created_at, updatedAt: r.updated_at,
  }
}
function resourceToRow(r: Partial<Resource>) {
  return {
    category: r.category, title: r.title, description: r.description, file_name: r.fileName,
    file_path: r.filePath, file_url: r.fileUrl, file_size: r.fileSize, mime: r.mime,
    author: r.author, updated_at: new Date().toISOString(),
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ============================================
// Assets
// ============================================
export const db = {
  mode: (): 'supabase' | 'local' => (isSupabaseMode() ? 'supabase' : 'local'),

  async listAssets(): Promise<Asset[]> {
    if (supabase) {
      const { data, error } = await supabase.from('assets').select('*').order('hostname')
      if (error) throw error
      return (data ?? []).map(assetFromRow)
    }
    return lsRead<Asset>(LS_ASSETS).sort((a, b) => a.hostname.localeCompare(b.hostname))
  },

  async getAsset(id: string): Promise<Asset | null> {
    if (supabase) {
      const { data, error } = await supabase.from('assets').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return data ? assetFromRow(data) : null
    }
    return lsRead<Asset>(LS_ASSETS).find((a) => a.id === id) ?? null
  },

  async createAsset(input: Omit<Asset, 'id' | 'createdAt'>): Promise<Asset> {
    if (supabase) {
      const { data, error } = await supabase.from('assets').insert(assetToRow(input)).select().single()
      if (error) throw error
      return assetFromRow(data)
    }
    const asset: Asset = { ...input, id: uid(), createdAt: new Date().toISOString() }
    const all = lsRead<Asset>(LS_ASSETS)
    all.push(asset)
    lsWrite(LS_ASSETS, all)
    return asset
  },

  async updateAsset(id: string, input: Partial<Asset>): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('assets').update(assetToRow(input)).eq('id', id)
      if (error) throw error
      return
    }
    const all = lsRead<Asset>(LS_ASSETS)
    const idx = all.findIndex((a) => a.id === id)
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...input }
      lsWrite(LS_ASSETS, all)
    }
  },

  async deleteAsset(id: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('assets').delete().eq('id', id)
      if (error) throw error
      return
    }
    lsWrite(LS_ASSETS, lsRead<Asset>(LS_ASSETS).filter((a) => a.id !== id))
  },

  // ============================================
  // Scans
  // ============================================
  async listScans(): Promise<Scan[]> {
    if (supabase) {
      const { data, error } = await supabase.from('scans').select('*').order('scan_date', { ascending: false })
      if (error) throw error
      return (data ?? []).map(scanFromRow)
    }
    return lsRead<Scan>(LS_SCANS).sort((a, b) => b.scanDate.localeCompare(a.scanDate))
  },

  async getScan(id: string): Promise<Scan | null> {
    if (supabase) {
      const { data, error } = await supabase.from('scans').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return data ? scanFromRow(data) : null
    }
    return lsRead<Scan>(LS_SCANS).find((s) => s.id === id) ?? null
  },

  async createScan(scan: Scan): Promise<Scan> {
    if (supabase) {
      const { data, error } = await supabase.from('scans').insert(scanToRow(scan)).select().single()
      if (error) throw error
      return scanFromRow(data)
    }
    const all = lsRead<Scan>(LS_SCANS)
    all.push(scan)
    lsWrite(LS_SCANS, all)
    return scan
  },

  async deleteScan(id: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('scans').delete().eq('id', id)
      if (error) throw error
      return
    }
    lsWrite(LS_SCANS, lsRead<Scan>(LS_SCANS).filter((s) => s.id !== id))
  },

  // ============================================
  // Fixes (조치 이력)
  // ============================================
  async listFixes(): Promise<FixRun[]> {
    if (supabase) {
      const { data, error } = await supabase.from('fixes').select('*').order('fix_date', { ascending: false })
      if (error) throw error
      return (data ?? []).map(fixFromRow)
    }
    return lsRead<FixRun>(LS_FIXES).sort((a, b) => b.fixDate.localeCompare(a.fixDate))
  },

  async getFix(id: string): Promise<FixRun | null> {
    if (supabase) {
      const { data, error } = await supabase.from('fixes').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return data ? fixFromRow(data) : null
    }
    return lsRead<FixRun>(LS_FIXES).find((f) => f.id === id) ?? null
  },

  async createFix(fix: FixRun): Promise<FixRun> {
    if (supabase) {
      const { data, error } = await supabase.from('fixes').insert(fixToRow(fix)).select().single()
      if (error) throw error
      return fixFromRow(data)
    }
    const all = lsRead<FixRun>(LS_FIXES)
    all.push(fix)
    lsWrite(LS_FIXES, all)
    return fix
  },

  async deleteFix(id: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('fixes').delete().eq('id', id)
      if (error) throw error
      return
    }
    lsWrite(LS_FIXES, lsRead<FixRun>(LS_FIXES).filter((f) => f.id !== id))
  },

  // ============================================
  // Notices (보안 공지사항)
  // ============================================
  async listNotices(): Promise<Notice[]> {
    if (supabase) {
      const { data, error } = await supabase.from('notices')
        .select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map(noticeFromRow)
    }
    return lsRead<Notice>(LS_NOTICES).sort((a, b) =>
      a.pinned === b.pinned ? b.createdAt.localeCompare(a.createdAt) : a.pinned ? -1 : 1)
  },

  async getNotice(id: string): Promise<Notice | null> {
    if (supabase) {
      const { data, error } = await supabase.from('notices').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return data ? noticeFromRow(data) : null
    }
    return lsRead<Notice>(LS_NOTICES).find((n) => n.id === id) ?? null
  },

  async createNotice(input: Omit<Notice, 'id' | 'views' | 'createdAt' | 'updatedAt'>): Promise<Notice> {
    if (supabase) {
      const { data, error } = await supabase.from('notices').insert(noticeToRow(input)).select().single()
      if (error) throw error
      return noticeFromRow(data)
    }
    const now = new Date().toISOString()
    const notice: Notice = { ...input, id: uid(), views: 0, createdAt: now, updatedAt: now }
    const all = lsRead<Notice>(LS_NOTICES)
    all.push(notice)
    lsWrite(LS_NOTICES, all)
    return notice
  },

  async updateNotice(id: string, input: Partial<Notice>): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('notices').update(noticeToRow(input)).eq('id', id)
      if (error) throw error
      return
    }
    const all = lsRead<Notice>(LS_NOTICES)
    const idx = all.findIndex((n) => n.id === id)
    if (idx >= 0) { all[idx] = { ...all[idx], ...input, updatedAt: new Date().toISOString() }; lsWrite(LS_NOTICES, all) }
  },

  async deleteNotice(id: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('notices').delete().eq('id', id)
      if (error) throw error
      return
    }
    lsWrite(LS_NOTICES, lsRead<Notice>(LS_NOTICES).filter((n) => n.id !== id))
  },

  /** 조회수 +1 (best-effort) */
  async bumpNoticeViews(id: string, current: number): Promise<void> {
    if (supabase) {
      await supabase.from('notices').update({ views: current + 1 }).eq('id', id)
      return
    }
    const all = lsRead<Notice>(LS_NOTICES)
    const idx = all.findIndex((n) => n.id === id)
    if (idx >= 0) { all[idx].views = current + 1; lsWrite(LS_NOTICES, all) }
  },

  // ============================================
  // Threats (보안 동향 · CVE)
  // ============================================
  async listThreats(): Promise<Threat[]> {
    if (supabase) {
      const { data, error } = await supabase.from('threats').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map(threatFromRow)
    }
    return lsRead<Threat>(LS_THREATS).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async getThreat(id: string): Promise<Threat | null> {
    if (supabase) {
      const { data, error } = await supabase.from('threats').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return data ? threatFromRow(data) : null
    }
    return lsRead<Threat>(LS_THREATS).find((t) => t.id === id) ?? null
  },

  async createThreat(input: Omit<Threat, 'id' | 'views' | 'createdAt' | 'updatedAt'>): Promise<Threat> {
    if (supabase) {
      const { data, error } = await supabase.from('threats').insert(threatToRow(input)).select().single()
      if (error) throw error
      return threatFromRow(data)
    }
    const now = new Date().toISOString()
    const threat: Threat = { ...input, id: uid(), views: 0, createdAt: now, updatedAt: now }
    const all = lsRead<Threat>(LS_THREATS)
    all.push(threat)
    lsWrite(LS_THREATS, all)
    return threat
  },

  async updateThreat(id: string, input: Partial<Threat>): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('threats').update(threatToRow(input)).eq('id', id)
      if (error) throw error
      return
    }
    const all = lsRead<Threat>(LS_THREATS)
    const idx = all.findIndex((t) => t.id === id)
    if (idx >= 0) { all[idx] = { ...all[idx], ...input, updatedAt: new Date().toISOString() }; lsWrite(LS_THREATS, all) }
  },

  async deleteThreat(id: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('threats').delete().eq('id', id)
      if (error) throw error
      return
    }
    lsWrite(LS_THREATS, lsRead<Threat>(LS_THREATS).filter((t) => t.id !== id))
  },

  async bumpThreatViews(id: string, current: number): Promise<void> {
    if (supabase) {
      await supabase.from('threats').update({ views: current + 1 }).eq('id', id)
      return
    }
    const all = lsRead<Threat>(LS_THREATS)
    const idx = all.findIndex((t) => t.id === id)
    if (idx >= 0) { all[idx].views = current + 1; lsWrite(LS_THREATS, all) }
  },

  // ============================================
  // Resources (자료실) — Supabase Storage 연동
  // ============================================
  async listResources(): Promise<Resource[]> {
    if (supabase) {
      const { data, error } = await supabase.from('resources').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map(resourceFromRow)
    }
    return lsRead<Resource>(LS_RESOURCES).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async getResource(id: string): Promise<Resource | null> {
    if (supabase) {
      const { data, error } = await supabase.from('resources').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return data ? resourceFromRow(data) : null
    }
    return lsRead<Resource>(LS_RESOURCES).find((r) => r.id === id) ?? null
  },

  /** 파일 업로드 → { filePath, fileUrl }. Supabase: Storage 버킷 / 로컬: data URL */
  async uploadResourceFile(file: File): Promise<{ filePath: string; fileUrl: string }> {
    if (supabase) {
      const safe = file.name.replace(/[^\w.\-]/g, '_')
      const path = `${uid()}-${safe}`
      const { error } = await supabase.storage.from(RESOURCE_BUCKET).upload(path, file, {
        cacheControl: '3600', upsert: false, contentType: file.type || undefined,
      })
      if (error) throw error
      const { data } = supabase.storage.from(RESOURCE_BUCKET).getPublicUrl(path)
      return { filePath: path, fileUrl: data.publicUrl }
    }
    const fileUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(r.result as string)
      r.onerror = () => rej(new Error('파일 읽기 실패'))
      r.readAsDataURL(file)
    })
    return { filePath: '', fileUrl }
  },

  async createResource(input: Omit<Resource, 'id' | 'downloads' | 'createdAt' | 'updatedAt'>): Promise<Resource> {
    if (supabase) {
      const { data, error } = await supabase.from('resources').insert(resourceToRow(input)).select().single()
      if (error) throw error
      return resourceFromRow(data)
    }
    const now = new Date().toISOString()
    const r: Resource = { ...input, id: uid(), downloads: 0, createdAt: now, updatedAt: now }
    const all = lsRead<Resource>(LS_RESOURCES)
    all.push(r)
    lsWrite(LS_RESOURCES, all)
    return r
  },

  async deleteResource(r: Resource): Promise<void> {
    if (supabase) {
      if (r.filePath) await supabase.storage.from(RESOURCE_BUCKET).remove([r.filePath]).catch(() => {})
      const { error } = await supabase.from('resources').delete().eq('id', r.id)
      if (error) throw error
      return
    }
    lsWrite(LS_RESOURCES, lsRead<Resource>(LS_RESOURCES).filter((x) => x.id !== r.id))
  },

  async bumpResourceDownloads(id: string, current: number): Promise<void> {
    if (supabase) {
      await supabase.from('resources').update({ downloads: current + 1 }).eq('id', id)
      return
    }
    const all = lsRead<Resource>(LS_RESOURCES)
    const idx = all.findIndex((x) => x.id === id)
    if (idx >= 0) { all[idx].downloads = current + 1; lsWrite(LS_RESOURCES, all) }
  },
}

/** 최신 점검만 자산별로 추출 (취약점 현황/대시보드 집계용) */
export function latestScanPerAsset(scans: Scan[]): Scan[] {
  const byKey = new Map<string, Scan>()
  for (const s of scans) {
    const key = s.assetId ?? `host:${s.hostname}`
    const cur = byKey.get(key)
    if (!cur || s.scanDate > cur.scanDate) byKey.set(key, s)
  }
  return [...byKey.values()]
}
