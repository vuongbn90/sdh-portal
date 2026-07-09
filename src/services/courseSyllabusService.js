import { supabase } from '../lib/supabaseClient.js'

const TABLE = 'course_syllabi'

function stripClientId(row = {}) {
  // Khi lưu bảng con, luôn bỏ id do frontend tạo hoặc id null.
  // PostgreSQL/Supabase sẽ tự sinh id bằng gen_random_uuid().
  const { id, syllabus_id, created_at, updated_at, ...rest } = row || {}
  return rest
}

async function safeSelect(table, orderBy = 'created_at') {
  const { data, error } = await supabase.from(table).select('*').order(orderBy, { ascending: false })
  if (error) return []
  return data || []
}

export async function loadCatalogs() {
  const [courses, faculty, programs] = await Promise.all([
    safeSelect('courses', 'created_at'),
    safeSelect('faculty_profiles', 'created_at'),
    safeSelect('training_programs', 'created_at'),
  ])
  return { courses, faculty, programs }
}

export async function listSyllabi({ search = '', status = '' } = {}) {
  let query = supabase.from(TABLE).select('*').order('updated_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (search?.trim()) {
    const q = search.trim().replaceAll(',', ' ')
    query = query.or(`course_code.ilike.%${q}%,vietnamese_title.ilike.%${q}%,english_title.ilike.%${q}%,course_name.ilike.%${q}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

async function readChild(table, syllabusId, orderBy = 'created_at') {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('syllabus_id', syllabusId)
    .order(orderBy, { ascending: true })

  if (error) throw error
  return data || []
}

export async function getSyllabusBundle(id) {
  const { data: syllabus, error } = await supabase.from(TABLE).select('*').eq('id', id).single()
  if (error) throw error

  const [instructors, objectives, clos, mappings, teachingPlans, assessments, references] = await Promise.all([
    readChild('course_syllabus_instructors', id),
    readChild('course_objectives', id),
    readChild('course_clos', id),
    readChild('course_clo_plo_mappings', id),
    readChild('course_teaching_plans', id, 'week_no'),
    readChild('course_assessment_plans', id),
    readChild('course_references', id),
  ])

  return { syllabus, instructors, objectives, clos, mappings, teachingPlans, assessments, references }
}

async function replaceChildren(table, syllabusId, rows = []) {
  const { error: delError } = await supabase.from(table).delete().eq('syllabus_id', syllabusId)
  if (delError) throw delError

  const cleanRows = (rows || [])
    .filter(Boolean)
    .map((row) => ({ ...stripClientId(row), syllabus_id: syllabusId }))

  if (!cleanRows.length) return []

  const { data, error } = await supabase.from(table).insert(cleanRows).select('*')
  if (error) throw error
  return data || []
}

export async function saveSyllabusBundle(values, details = {}) {
  const now = new Date().toISOString()
  const { id, created_at, updated_at, ...rest } = values || {}

  const syllabusPayload = {
    ...rest,
    course_name: rest.course_name || rest.vietnamese_title || '',
    course_name_en: rest.course_name_en || rest.english_title || '',
    status: rest.status || 'draft',
    updated_at: now,
  }

  let syllabus
  if (id) {
    const { data, error } = await supabase
      .from(TABLE)
      .update(syllabusPayload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    syllabus = data
  } else {
    const { data, error } = await supabase
      .from(TABLE)
      .insert([{ ...syllabusPayload, created_at: now }])
      .select('*')
      .single()

    if (error) throw error
    syllabus = data
  }

  const syllabusId = syllabus.id

  await Promise.all([
    replaceChildren('course_syllabus_instructors', syllabusId, details.instructors),
    replaceChildren('course_objectives', syllabusId, details.objectives),
    replaceChildren('course_clos', syllabusId, details.clos),
    replaceChildren('course_clo_plo_mappings', syllabusId, details.mappings),
    replaceChildren('course_teaching_plans', syllabusId, details.teachingPlans),
    replaceChildren('course_assessment_plans', syllabusId, details.assessments),
    replaceChildren('course_references', syllabusId, details.references),
  ])

  return getSyllabusBundle(syllabusId)
}

export async function deleteSyllabus(id) {
  await Promise.all([
    supabase.from('course_syllabus_instructors').delete().eq('syllabus_id', id),
    supabase.from('course_objectives').delete().eq('syllabus_id', id),
    supabase.from('course_clos').delete().eq('syllabus_id', id),
    supabase.from('course_clo_plo_mappings').delete().eq('syllabus_id', id),
    supabase.from('course_teaching_plans').delete().eq('syllabus_id', id),
    supabase.from('course_assessment_plans').delete().eq('syllabus_id', id),
    supabase.from('course_references').delete().eq('syllabus_id', id),
  ])

  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
  return true
}
