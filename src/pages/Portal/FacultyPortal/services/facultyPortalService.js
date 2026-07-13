import { supabase } from '../../../../services/supabase'

export async function loadFacultyPortalData(facultyId) {
  if (!facultyId) return null
  const [faculty, ris, publications, projects, supervisions, teaching] = await Promise.all([
    supabase.from('faculty').select('*').eq('id', facultyId).maybeSingle(),
    supabase.from('ris21_faculty_profiles').select('*').eq('faculty_id', facultyId).maybeSingle(),
    supabase.from('faculty_publications').select('*').eq('faculty_id', facultyId).order('year', { ascending: false }),
    supabase.from('faculty_projects').select('*').eq('faculty_id', facultyId).order('start_year', { ascending: false }),
    supabase.from('faculty_supervisions').select('*').eq('faculty_id', facultyId).order('year', { ascending: false }),
    supabase.from('study_plan_classes').select('*, study_plans(*, courses(*), programs(*))').eq('teacher_id', facultyId),
  ])
  const errors = [faculty, ris, publications, projects, supervisions, teaching].map(x => x.error).filter(Boolean)
  if (errors.length) throw errors[0]
  return {
    faculty: faculty.data || null,
    risProfile: ris.data || null,
    publications: publications.data || [],
    projects: projects.data || [],
    supervisions: supervisions.data || [],
    teaching: teaching.data || [],
  }
}

export async function updateFaculty(facultyId, values) {
  return supabase.from('faculty').update({ ...values, updated_at: new Date().toISOString() }).eq('id', facultyId)
}

export async function upsertRisProfile(facultyId, values) {
  return supabase.from('ris21_faculty_profiles').upsert(
    { ...values, faculty_id: facultyId, updated_at: new Date().toISOString() },
    { onConflict: 'faculty_id' },
  )
}

export async function saveRow(table, facultyId, values, editingId) {
  const payload = { ...values, faculty_id: facultyId, updated_at: new Date().toISOString() }
  if (editingId) return supabase.from(table).update(payload).eq('id', editingId)
  return supabase.from(table).insert([{ ...payload, created_at: new Date().toISOString() }])
}

export async function deleteRow(table, id) {
  return supabase.from(table).delete().eq('id', id)
}
