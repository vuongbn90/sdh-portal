import { DeleteOutlined, DownloadOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const tableName = 'courses'
const emptyCourse = {
  course_code: '',
  course_name: '',
  credits: 3,
  course_type: 'Bắt buộc',
  semester: 1,
  program_id: null,
  status: 'active',
  description: '',
}

function pick(row, keys, fallback = '') {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  return fallback
}

export default function CoursesPage() {
  const [rows, setRows] = useState([])
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false })
    if (error) message.error(error.message)
    setRows(data || [])
    const { data: programData } = await supabase.from('programs').select('*')
    setPrograms(programData || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [rows, keyword])

  const stats = useMemo(() => {
    const total = rows.length
    const active = rows.filter((r) => pick(r, ['status', 'trang_thai'], 'active') === 'active').length
    const required = rows.filter((r) => String(pick(r, ['course_type', 'type', 'loai_hoc_phan'], '')).toLowerCase().includes('bắt')).length
    const elective = rows.filter((r) => String(pick(r, ['course_type', 'type', 'loai_hoc_phan'], '')).toLowerCase().includes('tự')).length
    return { total, active, required, elective }
  }, [rows])

  const openCreate = () => {
    setEditing(null)
    form.setFieldsValue(emptyCourse)
    setOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({
      course_code: pick(record, ['course_code', 'code', 'ma_hoc_phan']),
      course_name: pick(record, ['course_name', 'name', 'ten_hoc_phan']),
      credits: pick(record, ['credits', 'so_tin_chi'], 3),
      course_type: pick(record, ['course_type', 'type', 'loai_hoc_phan'], 'Bắt buộc'),
      semester: pick(record, ['semester', 'hoc_ky'], 1),
      program_id: record.program_id || null,
      status: pick(record, ['status', 'trang_thai'], 'active'),
      description: pick(record, ['description', 'ghi_chu'], ''),
    })
    setOpen(true)
  }

  const save = async () => {
    const values = await form.validateFields()
    const payload = {
  code: values.course_code,
  name: values.course_name,

  course_code: values.course_code,
  course_name: values.course_name,

  credits: values.credits,
  course_type: values.course_type,
  semester: String(values.semester),
  program_id: values.program_id || null,
  status: values.status,
  description: values.description || '',
  updated_at: new Date().toISOString(),
}

    let error
    if (editing?.id) {
      ;({ error } = await supabase.from(tableName).update(payload).eq('id', editing.id))
    } else {
      ;({ error } = await supabase.from(tableName).insert([{ ...payload, created_at: new Date().toISOString() }]))
    }
    if (error) return message.error(error.message)
    message.success(editing ? 'Đã cập nhật học phần' : 'Đã thêm học phần')
    setOpen(false)
    load()
  }

  const remove = async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa học phần')
    load()
  }

  const programName = (programId) => {
    const p = programs.find((x) => x.id === programId)
    return pick(p, ['program_name', 'name', 'ten_ctdt', 'title'], '')
  }

  const columns = [
    { title: 'Mã HP', dataIndex: 'course_code', render: (_, r) => <b>{pick(r, ['course_code', 'code', 'ma_hoc_phan'])}</b> },
    { title: 'Tên học phần', dataIndex: 'course_name', render: (_, r) => pick(r, ['course_name', 'name', 'ten_hoc_phan']) },
    { title: 'Tín chỉ', dataIndex: 'credits', align: 'center', render: (_, r) => pick(r, ['credits', 'so_tin_chi'], 0) },
    { title: 'Loại', dataIndex: 'course_type', render: (_, r) => <Tag color={String(pick(r, ['course_type', 'type', 'loai_hoc_phan'])).includes('Tự') ? 'purple' : 'blue'}>{pick(r, ['course_type', 'type', 'loai_hoc_phan'], 'Bắt buộc')}</Tag> },
    { title: 'Học kỳ', dataIndex: 'semester', align: 'center', render: (_, r) => pick(r, ['semester', 'hoc_ky'], '') },
    { title: 'CTĐT', dataIndex: 'program_id', render: (_, r) => programName(r.program_id) || <span className="muted">Chưa gán</span> },
    { title: 'Trạng thái', dataIndex: 'status', render: (_, r) => <Tag color={pick(r, ['status'], 'active') === 'active' ? 'green' : 'default'}>{pick(r, ['status'], 'active')}</Tag> },
    { title: 'Thao tác', fixed: 'right', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openEdit(r)}>Sửa</Button><Popconfirm title="Xóa học phần này?" onConfirm={() => remove(r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  return <>
    <h1 className="page-title">Học phần</h1>
    <div className="page-subtitle">Quản lý mã học phần, tín chỉ, loại học phần và học kỳ trong chương trình đào tạo</div>
    <div className="stat-grid">
      <Card className="stat-card"><div className="muted">Tổng học phần</div><h2>{stats.total}</h2></Card>
      <Card className="stat-card"><div className="muted">Đang mở</div><h2>{stats.active}</h2></Card>
      <Card className="stat-card"><div className="muted">Bắt buộc</div><h2>{stats.required}</h2></Card>
      <Card className="stat-card"><div className="muted">Tự chọn</div><h2>{stats.elective}</h2></Card>
    </div>
    <Card className="toolbar-card" style={{ marginBottom: 16 }}>
      <div className="toolbar">
        <Input prefix={<SearchOutlined />} placeholder="Tìm mã học phần, tên học phần..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ maxWidth: 420 }} />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv('hoc-phan.csv', filtered)}>Xuất CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm học phần</Button>
        </Space>
      </div>
    </Card>
    <Card className="table-card">
      <Table rowKey="id" loading={loading} columns={columns} dataSource={filtered} scroll={{ x: 1100 }} pagination={{ pageSize: 8 }} />
    </Card>
    <Modal title={editing ? 'Cập nhật học phần' : 'Thêm học phần'} open={open} onCancel={() => setOpen(false)} onOk={save} okText="Lưu" cancelText="Hủy" width={760}>
      <Form form={form} layout="vertical">
        <div className="form-grid">
          <Form.Item name="course_code" label="Mã học phần" rules={[{ required: true, message: 'Nhập mã học phần' }]}><Input placeholder="VD: MBA601" /></Form.Item>
          <Form.Item name="course_name" label="Tên học phần" rules={[{ required: true, message: 'Nhập tên học phần' }]}><Input placeholder="VD: Phương pháp nghiên cứu" /></Form.Item>
          <Form.Item name="credits" label="Số tín chỉ"><InputNumber min={0} max={20} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="semester" label="Học kỳ"><InputNumber min={1} max={12} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="course_type" label="Loại học phần"><Select options={[{ value: 'Bắt buộc' }, { value: 'Tự chọn' }, { value: 'Luận văn/Luận án' }]} /></Form.Item>
          <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'active', label: 'Đang mở' }, { value: 'inactive', label: 'Ngưng mở' }]} /></Form.Item>
          <Form.Item name="program_id" label="Chương trình đào tạo" className="full"><Select allowClear showSearch placeholder="Chọn CTĐT" optionFilterProp="label" options={programs.map((p) => ({ value: p.id, label: programName(p.id) || p.id }))} /></Form.Item>
          <Form.Item name="description" label="Ghi chú" className="full"><Input.TextArea rows={3} /></Form.Item>
        </div>
      </Form>
    </Modal>
  </>
}
