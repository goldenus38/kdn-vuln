// ============================================
// Supabase 클라이언트
// env(VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) 가 모두 있을 때만 생성.
// 없으면 null → db 레이어가 localStorage 폴백 모드로 동작.
// ============================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export const isSupabaseMode = (): boolean => supabase !== null
