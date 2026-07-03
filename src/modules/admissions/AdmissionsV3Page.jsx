import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, UserAddOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { deleteAdmission, loadAdmissions, saveAdmission, convertToLearner, admissionStatusOptions } from './services/admissionsService'
import { supabase } from '../../services/supabase'

const emptyAdmission = {
  code: '',
  candidate_type: 'Thạc sĩ',
  application_status: 'pending',
  full_name: '',
  gender: '',
  email: '',
  phone: '',
  program_id: null,
  intake_year: new Date().getFullYear(),
  admission_round: '',
  education_level: '',
  graduation_school: '',
  graduation_year: null,
  graduation_gpa: null,
  major: '',
  english_certificate: '',
  english_score: '',
  exam_score: 0,
  interview_score: 0,
  result: '',
  note: '',
}

function pick(row, keys, fallback = '') {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  return fallback
}

export default function AdmissionsV3Page() {
  const [rows, setRows] = useState([])
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    const [ad, pr] = await Promise.all([
      loadAdmissions(),
      supabase.from('programs').select('*').order('created_at', { ascending: false }),
    ])
    if (ad.error) message.error(ad.error.message)
    if (pr.error) message.error(pr.error.message)
    setRows(ad.data || [])
    setPrograms(pr.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((x) => JSON.stringify(x).toLowerCase().includes(q))
  }, [rows, keyword])

  const stats = useMemo(() => ({
    total: rows.length,
    submitted: rows.filter((x) => ['submitted', 'checking', 'eligible', 'interview'].includes(x.application_status)).length,
    admitted: rows.filter((x) => x.application_status === 'admitted').length,
    enrolled: rows.filter((x) => x.application_status === 'enrolled').length,
  }), [rows])

  const programName = (id) => pick(programs.find((x) => x.id === id), ['program_name', 'name', 'title'], '')

  const openCreate = () => {
    setEditing(null)
    form.setFieldsValue(emptyAdmission)
    setOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue(record)
    setOpen(true)
  }

  const onSave = async () => {
    const values = await form.validateFields()
    const result = await saveAdmission(values, editing)
    if (result.error) return message.error(result.error.message)
    message.success('Đã lưu hồ sơ tuyển sinh')
    setOpen(false)
    load()
  }

  const onDelete = async (id) => {
    const result = await deleteAdmission(id)
    if (result.error) return message.error(result.error.message)
    message.success('Đã xóa')
    load()
  }

  const onConvert = async (record) => {
    const result = await convertToLearner(record)
    if (result.error) return message.error(result.error.message)
    message.success('Đã chuyển thành học viên/NCS')
    load()
  }

  const columns = [
    { title: 'Mã hồ sơ', dataIndex: 'code', render: (_, r) => <b>{r.code || r.admission_code}</b> },
    { title: 'Họ tên', dataIndex: 'full_name' },
    { title: 'Loại', dataIndex: 'candidate_type' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Điện thoại', dataIndex: 'phone' },
    { title: 'CTĐT', dataIndex: 'program_id', render: (id) => programName(id) || <span className="muted">Chưa gán</span> },
    { title: 'Năm', dataIndex: 'intake_year', align: 'center' },
    { title: 'Tổng điểm', dataIndex: 'total_score', align: 'center', render: (_, r) => Number(r.total_score || Number(r.exam_score || 0) + Number(r.interview_score || 0)).toFixed(2) },
    { title: 'Trạng thái', dataIndex: 'application_status', render: (v) => <Tag color={v === 'admitted' || v === 'enrolled' ? 'green' : v === 'rejected' ? 'red' : 'gold'}>{admissionStatusOptions.find((x) => x.value === v)?.label || v}</Tag> },
    { title: 'Thao tác', fixed: 'right', render: (_, r) => <Space>
      <Button icon={<EditOutlined />} onClick={() => openEdit(r)}>Sửa</Button>
      <Button icon={<UserAddOutlined />} disabled={!['admitted'].includes(r.application_status)} onClick={() => onConvert(r)}>Nhập học</Button>
      <Popconfirm title="Xóa hồ sơ?" onConfirm={() => onDelete(r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm>
    </Space> },
  ]

  return <>
    <h1 className="page-title">Tuyển sinh 3.0</h1>
    <div className="page-subtitle">Quản lý hồ sơ, xét tuyển, phỏng vấn, quyết định trúng tuyển và chuyển thành học viên/NCS.</div>

    <div className="stat-grid">
      <Card className="stat-card"><div className="muted">Tổng hồ sơ</div><h2>{stats.total}</h2></Card>
      <Card className="stat-card"><div className="muted">Đang xử lý</div><h2>{stats.submitted}</h2></Card>
      <Card className="stat-card"><div className="muted">Trúng tuyển</div><h2>{stats.admitted}</h2></Card>
      <Card className="stat-card"><div className="muted">Đã nhập học</div><h2>{stats.enrolled}</h2></Card>
    </div>

    <Card className="toolbar-card" style={{ marginBottom: 16 }}>
      <div className="toolbar">
        <Input prefix={<SearchOutlined />} placeholder="Tìm hồ sơ, họ tên, email..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ maxWidth: 420 }} />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm hồ sơ</Button>
        </Space>
      </div>
    </Card>

    <Card className="table-card">
      <Table rowKey="id" loading={loading} columns={columns} dataSource={filtered} scroll={{ x: 1500 }} pagination={{ pageSize: 8 }} />
    </Card>

    <Modal title={editing ? 'Cập nhật hồ sơ tuyển sinh' : 'Thêm hồ sơ tuyển sinh'} open={open} onCancel={() => setOpen(false)} onOk={onSave} okText="Lưu" cancelText="Hủy" width={940}>
      <Form form={form} layout="vertical">
        <div className="form-grid">
          <Form.Item name="code" label="Mã hồ sơ"><Input /></Form.Item>
          <Form.Item name="candidate_type" label="Loại ứng viên"><Select options={[{ value: 'Thạc sĩ' }, { value: 'Tiến sĩ' }, { value: 'Bồi dưỡng' }]} /></Form.Item>
          <Form.Item name="application_status" label="Trạng thái"><Select options={admissionStatusOptions} /></Form.Item>
          <Form.Item name="full_name" label="Họ và tên" rules={[{ required: true, message: 'Nhập họ tên' }]}><Input /></Form.Item>
          <Form.Item name="gender" label="Giới tính"><Select allowClear options={[{ value: 'Nam' }, { value: 'Nữ' }, { value: 'Khác' }]} /></Form.Item>
          <Form.Item name="email" label="Email"><Input /></Form.Item>
          <Form.Item name="phone" label="Điện thoại"><Input /></Form.Item>
          <Form.Item name="program_id" label="Chương trình đào tạo"><Select allowClear showSearch optionFilterProp="label" options={programs.map((p) => ({ value: p.id, label: programName(p.id) || p.id }))} /></Form.Item>
          <Form.Item name="intake_year" label="Năm tuyển sinh"><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="admission_round" label="Đợt tuyển sinh"><Input /></Form.Item>
          <Form.Item name="education_level" label="Trình độ đầu vào"><Input /></Form.Item>
          <Form.Item name="graduation_school" label="Trường tốt nghiệp"><Input /></Form.Item>
          <Form.Item name="graduation_year" label="Năm tốt nghiệp"><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="graduation_gpa" label="GPA"><InputNumber step={0.01} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="major" label="Ngành tốt nghiệp"><Input /></Form.Item>
          <Form.Item name="english_certificate" label="Chứng chỉ ngoại ngữ"><Input /></Form.Item>
          <Form.Item name="english_score" label="Điểm ngoại ngữ"><Input /></Form.Item>
          <Form.Item name="exam_score" label="Điểm xét/thi"><InputNumber min={0} step={0.25} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="interview_score" label="Điểm phỏng vấn"><InputNumber min={0} step={0.25} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="result" label="Kết quả"><Input /></Form.Item>
          <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={3} /></Form.Item>
        </div>
      </Form>
    </Modal>
  </>
}
