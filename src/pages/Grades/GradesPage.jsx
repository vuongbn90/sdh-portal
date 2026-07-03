import { DeleteOutlined, DownloadOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const tableName = 'grades'

const emptyGrade = {
  student_id: null,
  course_id: null,
  semester: '',
  academic_year: '',
  process_score: 0,
  final_score: 0,
  total_score: 0,
  letter_grade: '',
  result: 'Đạt',
  note: '',
}

function pick(row, keys, fallback = '') {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  return fallback
}

function calcLetter(score) {
  const n = Number(score)
  if (Number.isNaN(n)) return ''
  if (n >= 8.5) return 'A'
  if (n >= 7.0) return 'B'
  if (n >= 5.5) return 'C'
  if (n >= 4.0) return 'D'
  return 'F'
}

export default function GradesPage() {
  const [rows, setRows] = useState([])
  const [students, setStudents] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.from(tableName).select('*').order('updated_at', { ascending: false })
    if (error) message.error(error.message)
    setRows(data || [])

    const { data: studentData } = await supabase.from('students').select('*')
    setStudents(studentData || [])

    const { data: courseData } = await supabase.from('courses').select('*')
    setCourses(courseData || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const studentName = (studentId) => {
    const s = students.find((x) => x.id === studentId)
    return pick(s, ['full_name', 'name', 'ho_ten'], '')
  }

  const studentCode = (studentId) => {
    const s = students.find((x) => x.id === studentId)
    return pick(s, ['student_code', 'code', 'ma_hv'], '')
  }

  const courseName = (courseId) => {
    const c = courses.find((x) => x.id === courseId)
    return pick(c, ['course_name', 'name', 'ten_hoc_phan'], '')
  }

  const courseCode = (courseId) => {
    const c = courses.find((x) => x.id === courseId)
    return pick(c, ['course_code', 'code', 'ma_hoc_phan'], '')
  }

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const text = [
        JSON.stringify(r),
        studentName(r.student_id),
        studentCode(r.student_id),
        courseName(r.course_id),
        courseCode(r.course_id),
      ].join(' ').toLowerCase()
      return text.includes(q)
    })
  }, [rows, keyword, students, courses])

  const stats = useMemo(() => {
    const total = rows.length
    const passed = rows.filter((r) => String(pick(r, ['result', 'ket_qua'], '')).toLowerCase().includes('đạt') || Number(pick(r, ['total_score', 'total', 'diem_tong'], 0)) >= 5).length
    const failed = total - passed
    const avg = total ? (rows.reduce((sum, r) => sum + Number(pick(r, ['total_score', 'total', 'diem_tong'], 0)), 0) / total).toFixed(2) : 0
    return { total, passed, failed, avg }
  }, [rows])

  const openCreate = () => {
    setEditing(null)
    form.setFieldsValue(emptyGrade)
    setOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({
      student_id: record.student_id || null,
      course_id: record.course_id || null,
      semester: pick(record, ['semester', 'hoc_ky'], ''),
      academic_year: pick(record, ['academic_year', 'nam_hoc'], ''),
      process_score: pick(record, ['process_score', 'diem_qua_trinh'], 0),
      final_score: pick(record, ['final_score', 'diem_cuoi_ky'], 0),
      total_score: pick(record, ['total_score', 'total', 'diem_tong'], 0),
      letter_grade: pick(record, ['letter_grade', 'diem_chu'], ''),
      result: pick(record, ['result', 'ket_qua'], 'Đạt'),
      note: pick(record, ['note', 'ghi_chu'], ''),
    })
    setOpen(true)
  }

  const save = async () => {
    const values = await form.validateFields()
    const total = values.total_score !== undefined && values.total_score !== null
      ? Number(values.total_score)
      : Math.round((Number(values.process_score || 0) * 0.4 + Number(values.final_score || 0) * 0.6) * 100) / 100

    const payload = {
      student_id: values.student_id,
      course_id: values.course_id,
      semester: String(values.semester || ''),
      academic_year: values.academic_year || '',
      process_score: Number(values.process_score || 0),
      final_score: Number(values.final_score || 0),
      total_score: total,
      letter_grade: values.letter_grade || calcLetter(total),
      result: values.result || (total >= 5 ? 'Đạt' : 'Không đạt'),
      note: values.note || '',
      updated_at: new Date().toISOString(),
    }

    let error
    if (editing?.id) {
      ;({ error } = await supabase.from(tableName).update(payload).eq('id', editing.id))
    } else {
      ;({ error } = await supabase.from(tableName).insert([{ ...payload, created_at: new Date().toISOString() }]))
    }
    if (error) return message.error(error.message)
    message.success(editing ? 'Đã cập nhật điểm' : 'Đã thêm điểm')
    setOpen(false)
    load()
  }

  const remove = async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa điểm')
    load()
  }

  const columns = [
    { title: 'Mã HV', render: (_, r) => <b>{studentCode(r.student_id)}</b> },
    { title: 'Học viên', render: (_, r) => studentName(r.student_id) || <span className="muted">Chưa rõ</span> },
    { title: 'Mã HP', render: (_, r) => <b>{courseCode(r.course_id)}</b> },
    { title: 'Học phần', render: (_, r) => courseName(r.course_id) || <span className="muted">Chưa rõ</span> },
    { title: 'HK', dataIndex: 'semester', align: 'center' },
    { title: 'Năm học', dataIndex: 'academic_year', align: 'center' },
    { title: 'QT', dataIndex: 'process_score', align: 'center' },
    { title: 'CK', dataIndex: 'final_score', align: 'center' },
    { title: 'Tổng', dataIndex: 'total_score', align: 'center', render: (v) => <b>{v}</b> },
    { title: 'Chữ', dataIndex: 'letter_grade', align: 'center', render: (v) => <Tag color="blue">{v || '-'}</Tag> },
    { title: 'Kết quả', dataIndex: 'result', render: (v) => <Tag color={String(v).includes('Không') ? 'red' : 'green'}>{v || 'Đạt'}</Tag> },
    { title: 'Thao tác', fixed: 'right', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openEdit(r)}>Sửa</Button><Popconfirm title="Xóa điểm này?" onConfirm={() => remove(r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  return <>
    <h1 className="page-title">Điểm</h1>
    <div className="page-subtitle">Quản lý điểm học phần của học viên cao học</div>
    <div className="stat-grid">
      <Card className="stat-card"><div className="muted">Tổng bản ghi</div><h2>{stats.total}</h2></Card>
      <Card className="stat-card"><div className="muted">Đạt</div><h2>{stats.passed}</h2></Card>
      <Card className="stat-card"><div className="muted">Không đạt</div><h2>{stats.failed}</h2></Card>
      <Card className="stat-card"><div className="muted">Điểm TB</div><h2>{stats.avg}</h2></Card>
    </div>
    <Card className="toolbar-card" style={{ marginBottom: 16 }}>
      <div className="toolbar">
        <Input prefix={<SearchOutlined />} placeholder="Tìm học viên, mã học phần, tên học phần..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ maxWidth: 460 }} />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv('diem.csv', filtered)}>Xuất CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm điểm</Button>
        </Space>
      </div>
    </Card>
    <Card className="table-card">
      <Table rowKey="id" loading={loading} columns={columns} dataSource={filtered} scroll={{ x: 1350 }} pagination={{ pageSize: 8 }} />
    </Card>
    <Modal title={editing ? 'Cập nhật điểm' : 'Thêm điểm'} open={open} onCancel={() => setOpen(false)} onOk={save} okText="Lưu" cancelText="Hủy" width={820}>
      <Form form={form} layout="vertical">
        <div className="form-grid">
          <Form.Item name="student_id" label="Học viên" rules={[{ required: true, message: 'Chọn học viên' }]} className="full">
            <Select showSearch placeholder="Chọn học viên" optionFilterProp="label" options={students.map((s) => ({ value: s.id, label: `${studentCode(s.id)} - ${studentName(s.id)}` }))} />
          </Form.Item>
          <Form.Item name="course_id" label="Học phần" rules={[{ required: true, message: 'Chọn học phần' }]} className="full">
            <Select showSearch placeholder="Chọn học phần" optionFilterProp="label" options={courses.map((c) => ({ value: c.id, label: `${courseCode(c.id)} - ${courseName(c.id)}` }))} />
          </Form.Item>
          <Form.Item name="semester" label="Học kỳ"><Input placeholder="VD: HK1" /></Form.Item>
          <Form.Item name="academic_year" label="Năm học"><Input placeholder="VD: 2026-2027" /></Form.Item>
          <Form.Item name="process_score" label="Điểm quá trình"><InputNumber min={0} max={10} step={0.1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="final_score" label="Điểm cuối kỳ"><InputNumber min={0} max={10} step={0.1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="total_score" label="Điểm tổng"><InputNumber min={0} max={10} step={0.1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="letter_grade" label="Điểm chữ"><Input placeholder="A/B/C/D/F" /></Form.Item>
          <Form.Item name="result" label="Kết quả"><Select options={[{ value: 'Đạt' }, { value: 'Không đạt' }, { value: 'Chưa hoàn thành' }]} /></Form.Item>
          <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={3} /></Form.Item>
        </div>
      </Form>
    </Modal>
  </>
}
