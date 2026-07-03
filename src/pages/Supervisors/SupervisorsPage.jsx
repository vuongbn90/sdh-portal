import { DeleteOutlined, DownloadOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, TeamOutlined, UserAddOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const tables = {
  supervisors: 'supervisors',
  assignments: 'supervisor_assignments',
}

const emptySupervisor = {
  faculty_id: null,
  code: '',
  full_name: '',
  email: '',
  phone: '',
  academic_rank: '',
  degree: '',
  department: '',
  specialization: '',
  supervisor_type: 'GVHD chính',
  max_students: 0,
  current_students: 0,
  max_phd_students: 0,
  current_phd_students: 0,
  research_interests: '',
  status: 'active',
  note: '',
}

const emptyAssignment = {
  supervisor_id: null,
  faculty_id: null,
  student_id: null,
  phd_student_id: null,
  thesis_id: null,
  topic_id: null,
  role: 'GVHD chính',
  assigned_date: '',
  status: 'active',
  note: '',
}

function pick(row, keys, fallback = '') {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  return fallback
}

export default function SupervisorsPage() {
  const [supervisors, setSupervisors] = useState([])
  const [assignments, setAssignments] = useState([])
  const [faculty, setFaculty] = useState([])
  const [students, setStudents] = useState([])
  const [phdStudents, setPhdStudents] = useState([])
  const [theses, setTheses] = useState([])
  const [topics, setTopics] = useState([])
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    const [s, a, f, st, phd, th, rt] = await Promise.all([
      supabase.from(tables.supervisors).select('*').order('created_at', { ascending: false }),
      supabase.from(tables.assignments).select('*').order('created_at', { ascending: false }),
      supabase.from('faculty').select('*').order('full_name', { ascending: true }),
      supabase.from('students').select('*').order('full_name', { ascending: true }),
      supabase.from('phd_students').select('*').order('full_name', { ascending: true }),
      supabase.from('theses').select('*'),
      supabase.from('research_topics').select('*'),
    ])
    ;[s, a, f, st, phd, th, rt].forEach((x) => x.error && message.warning(x.error.message))
    setSupervisors(s.data || [])
    setAssignments(a.data || [])
    setFaculty(f.data || [])
    setStudents(st.data || [])
    setPhdStudents(phd.data || [])
    setTheses(th.data || [])
    setTopics(rt.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const facultyName = (id) => pick(faculty.find((x) => x.id === id), ['full_name', 'name', 'ho_ten'], '')
  const supervisorName = (id) => pick(supervisors.find((x) => x.id === id), ['full_name', 'name'], '')
  const studentName = (id) => pick(students.find((x) => x.id === id), ['full_name', 'name', 'ho_ten'], '')
  const phdName = (id) => pick(phdStudents.find((x) => x.id === id), ['full_name', 'name', 'ho_ten'], '')
  const thesisName = (id) => pick(theses.find((x) => x.id === id), ['title', 'name', 'topic_title'], '')
  const topicName = (id) => pick(topics.find((x) => x.id === id), ['title', 'name', 'topic_title'], '')

  const options = {
    faculty: faculty.map((x) => ({ value: x.id, label: pick(x, ['full_name', 'name', 'ho_ten'], x.id) })),
    supervisors: supervisors.map((x) => ({ value: x.id, label: pick(x, ['full_name'], x.id) })),
    students: students.map((x) => ({ value: x.id, label: pick(x, ['full_name', 'name', 'ho_ten'], x.id) })),
    phdStudents: phdStudents.map((x) => ({ value: x.id, label: pick(x, ['full_name', 'name', 'ho_ten'], x.id) })),
    theses: theses.map((x) => ({ value: x.id, label: pick(x, ['title', 'name', 'topic_title'], x.id) })),
    topics: topics.map((x) => ({ value: x.id, label: pick(x, ['title', 'name', 'topic_title'], x.id) })),
  }

  const filteredSupervisors = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return supervisors
    return supervisors.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [supervisors, keyword])

  const filteredAssignments = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return assignments
    return assignments.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [assignments, keyword])

  const stats = useMemo(() => ({
    total: supervisors.length,
    active: supervisors.filter((x) => pick(x, ['status'], 'active') === 'active').length,
    overloaded: supervisors.filter((x) => Number(x.current_students || 0) > Number(x.max_students || 0) && Number(x.max_students || 0) > 0).length,
    assignments: assignments.length,
  }), [supervisors, assignments])

  const onFacultyChange = (facultyId) => {
    const f = faculty.find((x) => x.id === facultyId)
    form.setFieldsValue({
      faculty_id: facultyId,
      code: pick(f, ['faculty_code', 'code', 'ma_gv'], ''),
      full_name: pick(f, ['full_name', 'name', 'ho_ten'], ''),
      email: pick(f, ['email'], ''),
      phone: pick(f, ['phone'], ''),
      academic_rank: pick(f, ['academic_rank', 'academic_title', 'hoc_ham'], ''),
      degree: pick(f, ['degree', 'hoc_vi'], ''),
      department: pick(f, ['department', 'unit', 'don_vi'], ''),
      specialization: pick(f, ['specialization', 'major', 'chuyen_mon'], ''),
    })
  }

  const openSupervisor = (record = null) => {
    setModal('supervisor')
    setEditing(record)
    form.resetFields()
    form.setFieldsValue(record || emptySupervisor)
  }

  const openAssignment = (record = null) => {
    setModal('assignment')
    setEditing(record)
    form.resetFields()
    form.setFieldsValue(record || emptyAssignment)
  }

  const closeModal = () => { setModal(null); setEditing(null); form.resetFields() }

  const save = async (table) => {
    const values = await form.validateFields()
    const payload = { ...values, updated_at: new Date().toISOString() }
    let result
    if (editing?.id) result = await supabase.from(table).update(payload).eq('id', editing.id)
    else result = await supabase.from(table).insert([{ ...payload, created_at: new Date().toISOString() }])
    if (result.error) return message.error(result.error.message)
    message.success('Đã lưu')
    closeModal(); load()
  }

  const remove = async (table, id) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa')
    load()
  }

  const supervisorColumns = [
    { title: 'Mã', dataIndex: 'code', width: 110, render: (v) => <b>{v}</b> },
    { title: 'Họ tên', dataIndex: 'full_name', width: 220, render: (v) => <b>{v}</b> },
    { title: 'Học hàm', dataIndex: 'academic_rank', width: 110 },
    { title: 'Học vị', dataIndex: 'degree', width: 110 },
    { title: 'Email', dataIndex: 'email', width: 220 },
    { title: 'Chuyên môn', dataIndex: 'specialization', width: 220 },
    { title: 'HV đang HD', dataIndex: 'current_students', align: 'center', width: 120, render: (_, r) => `${Number(r.current_students || 0)}/${Number(r.max_students || 0) || '∞'}` },
    { title: 'NCS đang HD', dataIndex: 'current_phd_students', align: 'center', width: 120, render: (_, r) => `${Number(r.current_phd_students || 0)}/${Number(r.max_phd_students || 0) || '∞'}` },
    { title: 'Trạng thái', dataIndex: 'status', width: 120, render: (v) => <Tag color={v === 'active' ? 'green' : 'default'}>{v || 'active'}</Tag> },
    { title: 'Thao tác', fixed: 'right', width: 180, render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openSupervisor(r)}>Sửa</Button><Popconfirm title="Xóa người hướng dẫn này?" onConfirm={() => remove(tables.supervisors, r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const assignmentColumns = [
    { title: 'Người hướng dẫn', dataIndex: 'supervisor_id', width: 220, render: (v) => supervisorName(v) },
    { title: 'Học viên', dataIndex: 'student_id', width: 180, render: (v) => studentName(v) || '—' },
    { title: 'NCS', dataIndex: 'phd_student_id', width: 180, render: (v) => phdName(v) || '—' },
    { title: 'Luận văn/Luận án', dataIndex: 'thesis_id', width: 260, render: (v) => thesisName(v) || '—' },
    { title: 'Đề tài', dataIndex: 'topic_id', width: 260, render: (v) => topicName(v) || '—' },
    { title: 'Vai trò', dataIndex: 'role', width: 130 },
    { title: 'Ngày phân công', dataIndex: 'assigned_date', width: 130 },
    { title: 'Trạng thái', dataIndex: 'status', width: 120, render: (v) => <Tag color={v === 'active' ? 'green' : 'default'}>{v || 'active'}</Tag> },
    { title: 'Thao tác', fixed: 'right', width: 180, render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openAssignment(r)}>Sửa</Button><Popconfirm title="Xóa phân công này?" onConfirm={() => remove(tables.assignments, r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  return <>
    <h1 className="page-title">Người hướng dẫn</h1>
    <div className="page-subtitle">Quản lý giảng viên hướng dẫn, năng lực hướng dẫn và phân công học viên/NCS.</div>

    <div className="stat-grid">
      <Card className="stat-card"><TeamOutlined /><div className="muted">Tổng người hướng dẫn</div><h2>{stats.total}</h2></Card>
      <Card className="stat-card"><TeamOutlined /><div className="muted">Đang hoạt động</div><h2>{stats.active}</h2></Card>
      <Card className="stat-card"><UserAddOutlined /><div className="muted">Phân công hướng dẫn</div><h2>{stats.assignments}</h2></Card>
      <Card className="stat-card"><TeamOutlined /><div className="muted">Vượt tải</div><h2>{stats.overloaded}</h2></Card>
    </div>

    <Card className="toolbar-card" style={{ marginBottom: 16 }}>
      <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
        <Input prefix={<SearchOutlined />} placeholder="Tìm người hướng dẫn, chuyên môn, email..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ width: 420 }} />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv('nguoi-huong-dan.csv', filteredSupervisors)}>Xuất CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openSupervisor()}>Thêm người hướng dẫn</Button>
          <Button icon={<UserAddOutlined />} onClick={() => openAssignment()}>Phân công</Button>
        </Space>
      </Space>
    </Card>

    <Tabs items={[
      { key: 'supervisors', label: 'Danh sách người hướng dẫn', children: <Card className="table-card"><Table rowKey="id" loading={loading} columns={supervisorColumns} dataSource={filteredSupervisors} scroll={{ x: 1500 }} pagination={{ pageSize: 8 }} /></Card> },
      { key: 'assignments', label: 'Phân công hướng dẫn', children: <Card className="table-card"><Table rowKey="id" loading={loading} columns={assignmentColumns} dataSource={filteredAssignments} scroll={{ x: 1600 }} pagination={{ pageSize: 8 }} /></Card> },
    ]} />

    <Modal title={editing ? 'Cập nhật người hướng dẫn' : 'Thêm người hướng dẫn'} open={modal === 'supervisor'} onCancel={closeModal} onOk={() => save(tables.supervisors)} okText="Lưu" cancelText="Hủy" width={900}>
      <Form form={form} layout="vertical"><div className="form-grid">
        <Form.Item name="faculty_id" label="Lấy dữ liệu từ giảng viên"><Select allowClear showSearch optionFilterProp="label" options={options.faculty} onChange={onFacultyChange} placeholder="Chọn giảng viên để tự điền" /></Form.Item>
        <Form.Item name="code" label="Mã"><Input /></Form.Item>
        <Form.Item name="full_name" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên' }]}><Input /></Form.Item>
        <Form.Item name="email" label="Email"><Input /></Form.Item>
        <Form.Item name="phone" label="Điện thoại"><Input /></Form.Item>
        <Form.Item name="academic_rank" label="Học hàm"><Input placeholder="PGS, GS..." /></Form.Item>
        <Form.Item name="degree" label="Học vị"><Input placeholder="Tiến sĩ, Thạc sĩ..." /></Form.Item>
        <Form.Item name="department" label="Đơn vị"><Input /></Form.Item>
        <Form.Item name="specialization" label="Chuyên môn"><Input /></Form.Item>
        <Form.Item name="supervisor_type" label="Loại"><Select options={[{ value: 'GVHD chính' }, { value: 'GVHD phụ' }, { value: 'Đồng hướng dẫn' }]} /></Form.Item>
        <Form.Item name="max_students" label="Tối đa HV"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="current_students" label="HV đang hướng dẫn"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="max_phd_students" label="Tối đa NCS"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="current_phd_students" label="NCS đang hướng dẫn"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'active', label: 'Đang hoạt động' }, { value: 'inactive', label: 'Ngưng' }]} /></Form.Item>
        <Form.Item name="research_interests" label="Hướng nghiên cứu" className="full"><Input.TextArea rows={3} /></Form.Item>
        <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={3} /></Form.Item>
      </div></Form>
    </Modal>

    <Modal title={editing ? 'Cập nhật phân công hướng dẫn' : 'Phân công hướng dẫn'} open={modal === 'assignment'} onCancel={closeModal} onOk={() => save(tables.assignments)} okText="Lưu" cancelText="Hủy" width={900}>
      <Form form={form} layout="vertical"><div className="form-grid">
        <Form.Item name="supervisor_id" label="Người hướng dẫn" rules={[{ required: true, message: 'Chọn người hướng dẫn' }]}><Select showSearch optionFilterProp="label" options={options.supervisors} /></Form.Item>
        <Form.Item name="role" label="Vai trò"><Select options={[{ value: 'GVHD chính' }, { value: 'GVHD phụ' }, { value: 'Đồng hướng dẫn' }]} /></Form.Item>
        <Form.Item name="student_id" label="Học viên cao học"><Select allowClear showSearch optionFilterProp="label" options={options.students} /></Form.Item>
        <Form.Item name="phd_student_id" label="Nghiên cứu sinh"><Select allowClear showSearch optionFilterProp="label" options={options.phdStudents} /></Form.Item>
        <Form.Item name="thesis_id" label="Luận văn/Luận án"><Select allowClear showSearch optionFilterProp="label" options={options.theses} /></Form.Item>
        <Form.Item name="topic_id" label="Đề tài"><Select allowClear showSearch optionFilterProp="label" options={options.topics} /></Form.Item>
        <Form.Item name="assigned_date" label="Ngày phân công"><Input placeholder="YYYY-MM-DD" /></Form.Item>
        <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'active', label: 'Đang hướng dẫn' }, { value: 'completed', label: 'Hoàn thành' }, { value: 'cancelled', label: 'Hủy' }]} /></Form.Item>
        <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={3} /></Form.Item>
      </div></Form>
    </Modal>
  </>
}
