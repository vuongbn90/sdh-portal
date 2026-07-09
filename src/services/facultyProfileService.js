import { supabase } from './supabase'

export const facultyProfileTables = {
  faculty: 'faculty',
  education: 'faculty_education',
  employment: 'faculty_employment',
  languages: 'faculty_languages',
  certificates: 'faculty_certificates',
  awards: 'faculty_awards',
  documents: 'faculty_documents',
}

export async function loadFacultyList() {
  return supabase.from(facultyProfileTables.faculty).select('*').order('full_name', { ascending: true })
}

export async function loadFacultyProfile(facultyId) {
  if (!facultyId) return { data: null, error: null }
  return supabase.from(facultyProfileTables.faculty).select('*').eq('id', facultyId).single()
}

export async function updateFacultyProfile(facultyId, payload) {
  return supabase
    .from(facultyProfileTables.faculty)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', facultyId)
}

export async function loadFacultyChild(table, facultyId, order = 'created_at') {
  if (!facultyId) return { data: [], error: null }
  return supabase.from(table).select('*').eq('faculty_id', facultyId).order(order, { ascending: false })
}

export async function saveFacultyChild(table, facultyId, values, editingId) {
  const payload = {
    ...values,
    faculty_id: facultyId,
    updated_at: new Date().toISOString(),
  }

  if (editingId) {
    return supabase.from(table).update(payload).eq('id', editingId)
  }

  return supabase.from(table).insert([{ ...payload, created_at: new Date().toISOString() }])
}

export async function deleteFacultyChild(table, id) {
  return supabase.from(table).delete().eq('id', id)
}
