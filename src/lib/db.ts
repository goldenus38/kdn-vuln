// ============================================
// 데이터 레이어
// Supabase 모드(env 설정 시) ↔ localStorage 폴백 모드를 동일한 API 로 추상화.
// 호스팅 확정 후 .env 채우고 supabase/schema.sql 적용하면 자동으로 Supabase 사용.
// ============================================

import type { Asset, Scan } from '../types'
import { supabase, isSupabaseMode } from './supabase'

const LS_ASSETS = 'kdnvuln_assets'
const LS_SCANS = 'kdnvuln_scans'

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
