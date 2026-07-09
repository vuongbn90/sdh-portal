import { supabase } from "../lib/supabaseClient.js";

const tables = {
  programs: 'cm_programs',
  pos: 'cm_pos',
  plos: 'cm_plos',
  jobs: 'cm_job_positions',
  courses: 'cm_courses',
  clos: 'cm_clos',
  poPlo: 'cm_po_plo_matrix',
  jobPlo: 'cm_job_plo_matrix',
  coursePlo: 'cm_course_plo_matrix',
  cloPlo: 'cm_clo_plo_matrix',
  assessments: 'cm_assessments',
  assessmentClo: 'cm_assessment_clo_matrix',
}

const stripId = (row = {}) => {
  const { id, created_at, updated_at, ...rest } = row
  return rest
}

export async function listPrograms() {
  const { data, error } = await supabase.from(tables.programs).select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function ensureProgram() {
  const programs = await listPrograms()
  if (programs.length) return programs[0]
  const { data, error } = await supabase.from(tables.programs).insert({ code: 'MBA-QTKD', name: 'Thạc sĩ Quản trị kinh doanh' }).select().single()
  if (error) throw error
  return data
}

export async function loadMatrixData(programId) {
  const program = programId ? { id: programId } : await ensureProgram()
  const pid = programId || program.id
  const [pos, plos, jobs, courses] = await Promise.all([
    supabase.from(tables.pos).select('*').eq('program_id', pid).order('sort_order'),
    supabase.from(tables.plos).select('*').eq('program_id', pid).order('sort_order'),
    supabase.from(tables.jobs).select('*').eq('program_id', pid).order('sort_order'),
    supabase.from(tables.courses).select('*').eq('program_id', pid).order('sort_order'),
  ])
  for (const r of [pos, plos, jobs, courses]) if (r.error) throw r.error

  const courseIds = (courses.data || []).map((x) => x.id)
  const [clos, assessments] = courseIds.length
    ? await Promise.all([
        supabase.from(tables.clos).select('*').in('course_id', courseIds).order('sort_order'),
        supabase.from(tables.assessments).select('*').in('course_id', courseIds).order('sort_order'),
      ])
    : [{ data: [] }, { data: [] }]
  if (clos.error) throw clos.error
  if (assessments.error) throw assessments.error

  const [poPlo, jobPlo, coursePlo, cloPlo, assessmentClo] = await Promise.all([
    supabase.from(tables.poPlo).select('*'),
    supabase.from(tables.jobPlo).select('*'),
    supabase.from(tables.coursePlo).select('*'),
    supabase.from(tables.cloPlo).select('*'),
    supabase.from(tables.assessmentClo).select('*'),
  ])
  for (const r of [poPlo, jobPlo, coursePlo, cloPlo, assessmentClo]) if (r.error) throw r.error

  return {
    program: programId ? (await supabase.from(tables.programs).select('*').eq('id', pid).single()).data : program,
    pos: pos.data || [],
    plos: plos.data || [],
    jobs: jobs.data || [],
    courses: courses.data || [],
    clos: clos.data || [],
    assessments: assessments.data || [],
    matrices: {
      poPlo: poPlo.data || [],
      jobPlo: jobPlo.data || [],
      coursePlo: coursePlo.data || [],
      cloPlo: cloPlo.data || [],
      assessmentClo: assessmentClo.data || [],
    },
  }
}

export async function upsertEntity(kind, payload) {
  const table = tables[kind]
  if (!table) throw new Error('Unknown table kind: ' + kind)
  const body = payload.id ? payload : stripId(payload)
  const query = payload.id
    ? supabase.from(table).update(stripId(payload)).eq('id', payload.id)
    : supabase.from(table).insert(body)
  const { data, error } = await query.select().single()
  if (error) throw error
  return data
}

export async function deleteEntity(kind, id) {
  const table = tables[kind]
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}

async function setMatrix(table, conflictKeys, payload, emptyValue) {
  const shouldDelete = payload.value === emptyValue || payload.value === undefined || payload.value === null || payload.value === ''
  let q = supabase.from(table)
  if (shouldDelete) {
    for (const key of conflictKeys) q = q.eq(key, payload[key])
    const { error } = await q.delete()
    if (error) throw error
    return null
  }
  const row = { ...payload }
  delete row.value
  const { data, error } = await supabase.from(table).upsert(row, { onConflict: conflictKeys.join(',') }).select().single()
  if (error) throw error
  return data
}

export const setPoPlo = ({ po_id, plo_id, contribution }) => setMatrix(tables.poPlo, ['po_id', 'plo_id'], { po_id, plo_id, contribution, value: contribution }, '')
export const setJobPlo = ({ job_id, plo_id, level }) => setMatrix(tables.jobPlo, ['job_id', 'plo_id'], { job_id, plo_id, level, value: level }, '')
export const setCoursePlo = ({ course_id, plo_id, level }) => setMatrix(tables.coursePlo, ['course_id', 'plo_id'], { course_id, plo_id, level, value: level }, '')
export const setCloPlo = ({ clo_id, plo_id, level }) => setMatrix(tables.cloPlo, ['clo_id', 'plo_id'], { clo_id, plo_id, level, value: level }, '')
export const setAssessmentClo = ({ assessment_id, clo_id, weight }) => setMatrix(tables.assessmentClo, ['assessment_id', 'clo_id'], { assessment_id, clo_id, weight, value: weight }, 0)

export async function seedMbaSample() {
  const program = await ensureProgram()
  const pid = program.id
  const poRows = [
    ['PO1','Kiến thức','Cung cấp kiến thức lý thuyết sâu rộng, hiện đại về quản trị và thực tiễn của môi trường kinh doanh.'],
    ['PO2','Kiến thức','Trang bị kiến thức nâng cao, chuyên sâu về QTKD và doanh nghiệp hàng không.'],
    ['PO3','Kỹ năng','Phân tích, tổng hợp, đánh giá dữ liệu và thông tin để đưa ra giải pháp xử lý vấn đề.'],
    ['PO4','Kỹ năng','Trang bị kỹ năng lãnh đạo, tổ chức, quản trị và quản lý hoạt động của tổ chức.'],
    ['PO5','Kỹ năng','Trang bị kỹ năng giao tiếp và truyền đạt tri thức thuyết phục.'],
    ['PO6','Kỹ năng','Trang bị kỹ năng nghiên cứu, phát triển và sử dụng công nghệ sáng tạo.'],
    ['PO7','Kỹ năng','Tích hợp kiến thức ngoại ngữ chuyên ngành.'],
    ['PO8','Tự chủ và trách nhiệm','Có năng lực phát hiện và giải quyết vấn đề trong QTKD.'],
    ['PO9','Tự chủ và trách nhiệm','Có khả năng tự định hướng phát triển năng lực cá nhân.'],
  ]
  const ploRows = [
    ['PLO1','K1','Kiến thức','Vận dụng thế giới quan và phương pháp luận khoa học để học tập, nghiên cứu suốt đời',4],
    ['PLO2','K2','Kiến thức','Tổng hợp lý thuyết quản trị hiện đại và kiến thức chuyên sâu về QTKD',4],
    ['PLO3','K3','Kiến thức','Tổng hợp kiến thức để nhận diện cơ hội, đánh giá và ra quyết định chiến lược',5],
    ['PLO4','S1','Kỹ năng','Phân tích, đánh giá kiến thức chuyên ngành để áp dụng vào thực tiễn',4],
    ['PLO5','S2','Kỹ năng','Thu thập, xử lý thông tin và nghiên cứu độc lập để giải quyết vấn đề',4],
    ['PLO6','S3','Kỹ năng','Lãnh đạo, tổ chức và quản trị doanh nghiệp hiệu quả',4],
    ['PLO7','S4','Kỹ năng','Giao tiếp, thuyết trình, đàm phán, thuyết phục và kết nối',4],
    ['PLO8','S5','Kỹ năng','Đạt trình độ ngoại ngữ tương đương bậc 4/6',4],
    ['PLO9','A1','Tự chủ và trách nhiệm','Phát hiện và kết luận chuyên gia về vấn đề phức tạp trong doanh nghiệp',4],
    ['PLO10','A2','Tự chủ và trách nhiệm','Định hướng trở thành lãnh đạo, chuyên gia cao cấp',4],
    ['PLO11','A3','Tự chủ và trách nhiệm','Trân trọng giá trị đạo đức để nâng cao giá trị cuộc sống',4],
  ]
  const courseRows = [
    ['811001','Phương pháp NCKH trong kinh doanh',3],
    ['811002','Quản trị chiến lược',3],
    ['811003','Tài chính cho nhà quản trị',3],
    ['811021','Đề án tốt nghiệp',6],
  ]
  const { data: pos, error: e1 } = await supabase.from(tables.pos).upsert(poRows.map((r,i)=>({program_id:pid,code:r[0],group_name:r[1],description:r[2],sort_order:i+1})), { onConflict: 'program_id,code' }).select()
  if (e1) throw e1
  const { data: plos, error: e2 } = await supabase.from(tables.plos).upsert(ploRows.map((r,i)=>({program_id:pid,code:r[0],sub_code:r[1],group_name:r[2],description:r[3],bloom_level:r[4],sort_order:i+1})), { onConflict: 'program_id,code' }).select()
  if (e2) throw e2
  const { error: e3 } = await supabase.from(tables.courses).insert(courseRows.map((r,i)=>({program_id:pid,course_code:r[0],course_name:r[1],credits:r[2],sort_order:i+1})))
  if (e3 && !String(e3.message).includes('duplicate')) throw e3
  return { pos, plos }
}
