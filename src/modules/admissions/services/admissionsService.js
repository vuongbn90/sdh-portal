import { supabase } from '../../../services/supabase'

export const admissionStatusOptions = [
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'submitted', label: 'Đã nộp hồ sơ' },
  { value: 'checking', label: 'Đang kiểm tra' },
  { value: 'eligible', label: 'Đủ điều kiện' },
  { value: 'interview', label: 'Phỏng vấn' },
  { value: 'admitted', label: 'Trúng tuyển' },
  { value: 'enrolled', label: 'Đã nhập học' },
  { value: 'rejected', label: 'Không đạt' },
]

export async function loadAdmissions() {
  return await supabase.from('admissions').select('*').order('created_at', { ascending: false })
}

export async function saveAdmission(values, editing) {
  const payload = {
    ...values,
    code: values.code || values.admission_code,
    admission_code: values.admission_code || values.code,
    total_score: Number(values.exam_score || 0) + Number(values.interview_score || 0),
    updated_at: new Date().toISOString(),
  }

  if (editing?.id) {
    return await supabase.from('admissions').update(payload).eq('id', editing.id)
  }
  return await supabase.from('admissions').insert([{ ...payload, created_at: new Date().toISOString() }])
}

export async function deleteAdmission(id) {
  return await supabase.from('admissions').delete().eq('id', id)
}

export async function convertToLearner(record) {
  const isPhd = String(record.candidate_type || record.education_level || '').toLowerCase().includes('tiến') || String(record.candidate_type || '').toLowerCase().includes('phd')
  const targetTable = isPhd ? 'phd_students' : 'students'
  const payload = {
    full_name: record.full_name,
    email: record.email,
    phone: record.phone,
    program_id: record.program_id,
    status: 'active',
    created_at: new Date().toISOString(),
  }
  const inserted = await supabase.from(targetTable).insert([payload])
  if (inserted.error) return inserted
  return await supabase.from('admissions').update({ application_status: 'enrolled', enrolled_date: new Date().toISOString().slice(0, 10) }).eq('id', record.id)
}
