import { supabase, hasSupabaseConfig } from '../lib/supabase'
import { students as mockStudents } from './mockData'

export async function listStudents() {
  if (!hasSupabaseConfig) return mockStudents
  const { data, error } = await supabase.from('students').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createStudent(payload) {
  if (!hasSupabaseConfig) return { ...payload, id: Date.now() }
  const { data, error } = await supabase.from('students').insert(payload).select().single()
  if (error) throw error
  return data
}
