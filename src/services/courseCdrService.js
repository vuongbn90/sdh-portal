import { supabase } from '../supabaseClient.js'

const T = {
  courses: 'cdr_courses',
  plos: 'cdr_plos',
  clos: 'cdr_clos',
  mappings: 'cdr_clo_plo_mappings',
}

function clean(row = {}) {
  const out = { ...row }
  Object.keys(out).forEach((k) => {
    if (out[k] === undefined) delete out[k]
    if (out[k] === '') out[k] = null
  })
  if (!out.id || String(out.id).startsWith('tmp-')) delete out.id
  return out
}

export async function loadCourseCdrData() {
  const [coursesRes, plosRes, closRes, mappingsRes] = await Promise.all([
    supabase.from(T.courses).select('*').order('course_code', { ascending: true }),
    supabase.from(T.plos).select('*').order('sort_order', { ascending: true }),
    supabase.from(T.clos).select('*, course:cdr_courses(*)').order('course_id', { ascending: true }).order('clo_code', { ascending: true }),
    supabase.from(T.mappings).select('*, clo:cdr_clos(*), plo:cdr_plos(*)').order('created_at', { ascending: true }),
  ])

  if (coursesRes.error) throw coursesRes.error
  if (plosRes.error) throw plosRes.error
  if (closRes.error) throw closRes.error
  if (mappingsRes.error) throw mappingsRes.error

  return {
    courses: coursesRes.data || [],
    plos: plosRes.data || [],
    clos: closRes.data || [],
    mappings: mappingsRes.data || [],
  }
}

export async function saveCourse(payload) {
  const row = clean(payload)
  row.updated_at = new Date().toISOString()
  const q = row.id
    ? supabase.from(T.courses).update(row).eq('id', row.id)
    : supabase.from(T.courses).insert(row)
  const { data, error } = await q.select().single()
  if (error) throw error
  return data
}

export async function deleteCourse(id) {
  const { error } = await supabase.from(T.courses).delete().eq('id', id)
  if (error) throw error
}

export async function savePlo(payload) {
  const row = clean(payload)
  row.updated_at = new Date().toISOString()
  const q = row.id
    ? supabase.from(T.plos).update(row).eq('id', row.id)
    : supabase.from(T.plos).insert(row)
  const { data, error } = await q.select().single()
  if (error) throw error
  return data
}

export async function deletePlo(id) {
  const { error } = await supabase.from(T.plos).delete().eq('id', id)
  if (error) throw error
}

export async function saveClo(payload) {
  const row = clean(payload)
  row.updated_at = new Date().toISOString()
  row.weight = Number(row.weight || 0)
  const q = row.id
    ? supabase.from(T.clos).update(row).eq('id', row.id)
    : supabase.from(T.clos).insert(row)
  const { data, error } = await q.select().single()
  if (error) throw error
  return data
}

export async function deleteClo(id) {
  const { error } = await supabase.from(T.clos).delete().eq('id', id)
  if (error) throw error
}

export async function saveMapping(payload) {
  const row = clean(payload)
  const q = row.id
    ? supabase.from(T.mappings).update(row).eq('id', row.id)
    : supabase.from(T.mappings).insert(row)
  const { data, error } = await q.select().single()
  if (error) throw error
  return data
}

export async function deleteMapping(id) {
  const { error } = await supabase.from(T.mappings).delete().eq('id', id)
  if (error) throw error
}

export function downloadCsv(filename, rows) {
  const headers = Object.keys(rows[0] || { empty: '' })
  const csv = [headers.join(',')]
    .concat(rows.map((r) => headers.map((h) => `"${String(r[h] ?? '').replaceAll('"', '""')}"`).join(',')))
    .join('\n')
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
