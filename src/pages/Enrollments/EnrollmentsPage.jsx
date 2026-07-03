import { DeleteOutlined, DownloadOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const tableName = 'enrollments'

function pick(row, keys, fallback = '') {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  }
  return fallback
}

export default function EnrollmentsPage() {
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

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false })

    if (error) message.error(error.message)
    setRows(data || [])

    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('*')
      .order('full_name', { ascending: true })

    if (studentError) message.error(studentError.message)
    setStudents(studentData || [])

    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })

    if (courseError) message.error(courseError.message)
    setCourses(courseData || [])

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const studentName = (studentId) => {
    const s = students.find((x) => x.id === studentId)
    if (!s) return ''
    const code = pick(s, ['student_code', 'code', 'ma_hv'], '')
    const name = pick(s, ['full_name', 'name', 'ho_ten'], '')
    return code ? `${code} - ${name}` : name
  }

  const courseName = (courseId) => {
    const c = courses.find((x) => x.id === courseId)
    if (!c) return ''
    const code = pick(c, ['course_code', 'code', 'ma_hoc_phan'], '')
    const name = pick(c, ['course_name', 'name', 'ten_hoc_phan'], '')
    return code ? `${code} - ${name}` : name
  }

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const text = [
        JSON.stringify(r),
        studentName(r.student_id),
        courseName(r.course_id),
      ].join(' ').toLowerCase()
      return text.includes(q)
    })
  }, [rows, keyword, students, courses])

  const stats = useMemo(() => {
    const total = rows.length
    const registered = rows.filter((r) => pick(r, ['status'], '') === 'registered').length
    const approved = rows.filter((r) => pick(r, ['status'], '') === 'approved').length
    const cancelled = rows.filter((r) => pick(r, ['status'], '') === 'cancelled').length
    return { total, registered, approved, cancelled }
  }, [rows])

  const openCreate = () => {
    setEditing(null)
    form.setFieldsValue({
      student_id: null,
      course_id: null,
      semester: 'HK1',
      academic_year: new Date().getFullYear().toString(),
      status: 'registered',
      note: '',
    })
    setOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({
      student_id: record.student_id || null,
      course_id: record.course_id || null,
      semester: pick(record, ['semester'], 'HK1'),
      academic_year: pick(record, ['academic_year'], ''),
      status: pick(record, ['status'], 'registered'),
      note: pick(record, ['note'], ''),
    })
    setOpen(true)
  }

  const save = async () => {
    const values = await form.validateFields()

    const payload = {
      student_id: values.student_id,
      course_id: values.course_id,
      semester: values.semester,
      academic_year: values.academic_year || null,
      status: values.status,
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

    message.success(editing ? 'Đã cập nhật đăng ký học phần' : 'Đã thêm đăng ký học phần')
    setOpen(false)
    load()
  }

  const remove = async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa đăng ký học phần')
    load()
  }

  const exportData = filtered.map((r) => ({
    id: r.id,
    student: studentName(r.student_id),
    course: courseName(r.course_id),
    semester: r.semester,
    academic_year: r.academic_year,
    status: r.status,
    note: r.note,
  }))

  const columns = [
    { title: 'Học viên', dataIndex: 'student_id', render: (_, r) => <b>{studentName(r.student_id) || 'Không rõ'}</b> },
    { title: 'Học phần', dataIndex: 'course_id', render: (_, r) => courseName(r.course_id) || 'Không rõ' },
    { title: 'Học kỳ', dataIndex: 'semester', align: 'center' },
    { title: 'Năm học', dataIndex: 'academic_year', align: 'center' },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status) => {
        const color = status === 'approved' ? 'green' : status === 'cancelled' ? 'red' : 'blue'
        const label = status === 'approved' ? 'Đã duyệt' : status === 'cancelled' ? 'Đã hủy' : 'Đã đăng ký'
        return <Tag color={color}>{label}</Tag>
      },
    },
    { title: 'Ghi chú', dataIndex: 'note' },
    {
      title: 'Thao tác',
      fixed: 'right',
      render: (_, r) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEdit(r)}>Sửa</Button>
          <Popconfirm title="Xóa đăng ký này?" onConfirm={() => remove(r.id)}>
            <Button danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <h1 className="page-title">Đăng ký học phần</h1>
      <div className="page-subtitle">Quản lý học viên đăng ký học phần theo học kỳ và năm học</div>

      <div className="stat-grid">
        <Card className="stat-card"><div className="muted">Tổng đăng ký</div><h2>{stats.total}</h2></Card>
        <Card className="stat-card"><div className="muted">Đã đăng ký</div><h2>{stats.registered}</h2></Card>
        <Card className="stat-card"><div className="muted">Đã duyệt</div><h2>{stats.approved}</h2></Card>
        <Card className="stat-card"><div className="muted">Đã hủy</div><h2>{stats.cancelled}</h2></Card>
      </div>

      <Card className="toolbar-card" style={{ marginBottom: 16 }}>
        <div className="toolbar">
          <Input prefix={<SearchOutlined />} placeholder="Tìm học viên, mã học phần, tên học phần..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ maxWidth: 480 }} />
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
            <Button icon={<DownloadOutlined />} onClick={() => exportCsv('dang-ky-hoc-phan.csv', exportData)}>Xuất CSV</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm đăng ký</Button>
          </Space>
        </div>
      </Card>

      <Card className="table-card">
        <Table rowKey="id" loading={loading} columns={columns} dataSource={filtered} scroll={{ x: 1200 }} pagination={{ pageSize: 8 }} />
      </Card>

      <Modal title={editing ? 'Cập nhật đăng ký học phần' : 'Thêm đăng ký học phần'} open={open} onCancel={() => setOpen(false)} onOk={save} okText="Lưu" cancelText="Hủy" width={760}>
        <Form form={form} layout="vertical">
          <div className="form-grid">
            <Form.Item name="student_id" label="Học viên" rules={[{ required: true, message: 'Chọn học viên' }]} className="full">
              <Select allowClear showSearch placeholder="Chọn học viên" optionFilterProp="label" options={students.map((s) => ({ value: s.id, label: studentName(s.id) || s.id }))} />
            </Form.Item>
            <Form.Item name="course_id" label="Học phần" rules={[{ required: true, message: 'Chọn học phần' }]} className="full">
              <Select allowClear showSearch placeholder="Chọn học phần" optionFilterProp="label" options={courses.map((c) => ({ value: c.id, label: courseName(c.id) || c.id }))} />
            </Form.Item>
            <Form.Item name="semester" label="Học kỳ" rules={[{ required: true, message: 'Nhập học kỳ' }]}>
              <Select options={[{ value: 'HK1', label: 'Học kỳ 1' }, { value: 'HK2', label: 'Học kỳ 2' }, { value: 'HK3', label: 'Học kỳ 3' }, { value: 'HK4', label: 'Học kỳ 4' }]} />
            </Form.Item>
            <Form.Item name="academic_year" label="Năm học"><Input placeholder="VD: 2026-2027" /></Form.Item>
            <Form.Item name="status" label="Trạng thái">
              <Select options={[{ value: 'registered', label: 'Đã đăng ký' }, { value: 'approved', label: 'Đã duyệt' }, { value: 'cancelled', label: 'Đã hủy' }]} />
            </Form.Item>
            <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={3} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </>
  )
}
