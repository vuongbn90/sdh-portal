import { DeleteOutlined, DownloadOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const tableName = 'admissions'

const initialForm = {
  code: '',
  full_name: '',
  email: '',
  phone: '',
  candidate_type: 'Thạc sĩ',
  program_id: null,
  intake_year: new Date().getFullYear(),
  admission_round: 'Đợt 1',
  application_status: 'new',
  exam_score: null,
  interview_score: null,
  total_score: null,
  result: 'pending',
  note: '',
}

function pick(row, keys, fallback = '') {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  return fallback
}

export default function AdmissionsPage() {
  const [rows, setRows] = useState([])
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    const [{ data, error }, { data: programData }] = await Promise.all([
      supabase.from(tableName).select('*').order('created_at', { ascending: false }),
      supabase.from('programs').select('*'),
    ])
    if (error) message.error(error.message)
    setRows(data || [])
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
    const master = rows.filter((r) => r.candidate_type === 'Thạc sĩ').length
    const phd = rows.filter((r) => r.candidate_type === 'Tiến sĩ').length
    const admitted = rows.filter((r) => r.result === 'admitted').length
    return { total, master, phd, admitted }
  }, [rows])

  const programName = (id) => {
    const p = programs.find((x) => x.id === id)
    return pick(p, ['program_name', 'name', 'title', 'ten_ctdt'], '')
  }

  const openCreate = () => {
    setEditing(null)
    form.setFieldsValue(initialForm)
    setOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({ ...initialForm, ...record })
    setOpen(true)
  }

  const save = async () => {
    const values = await form.validateFields()
    const totalScore = Number(values.exam_score || 0) + Number(values.interview_score || 0)
    const payload = {
      ...values,
      total_score: values.total_score ?? totalScore,
      updated_at: new Date().toISOString(),
    }

    let result
    if (editing?.id) {
      result = await supabase.from(tableName).update(payload).eq('id', editing.id)
    } else {
      result = await supabase.from(tableName).insert([{ ...payload, created_at: new Date().toISOString() }])
    }

    if (result.error) return message.error(result.error.message)
    message.success(editing ? 'Đã cập nhật hồ sơ tuyển sinh' : 'Đã thêm hồ sơ tuyển sinh')
    setOpen(false)
    load()
  }

  const remove = async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa hồ sơ')
    load()
  }

  const statusTag = (value) => {
    const map = {
      new: ['blue', 'Mới'],
      reviewing: ['gold', 'Đang xét'],
      approved: ['green', 'Đã duyệt'],
      rejected: ['red', 'Từ chối'],
    }
    const [color, label] = map[value] || ['default', value || '']
    return <Tag color={color}>{label}</Tag>
  }

  const resultTag = (value) => {
    const map = {
      pending: ['gold', 'Chờ kết quả'],
      admitted: ['green', 'Trúng tuyển'],
      failed: ['red', 'Không trúng tuyển'],
      reserved: ['blue', 'Bảo lưu'],
    }
    const [color, label] = map[value] || ['default', value || '']
    return <Tag color={color}>{label}</Tag>
  }

  const columns = [
    { title: 'Mã hồ sơ', dataIndex: 'code', width: 130, render: (v) => <b>{v}</b> },
    { title: 'Họ tên', dataIndex: 'full_name', width: 220 },
    { title: 'Email', dataIndex: 'email', width: 220 },
    { title: 'Điện thoại', dataIndex: 'phone', width: 140 },
    { title: 'Bậc tuyển sinh', dataIndex: 'candidate_type', width: 130, render: (v) => <Tag color={v === 'Tiến sĩ' ? 'purple' : 'blue'}>{v}</Tag> },
    { title: 'CTĐT', dataIndex: 'program_id', width: 220, render: (v) => programName(v) || <span className="muted">Chưa gán</span> },
    { title: 'Năm', dataIndex: 'intake_year', align: 'center', width: 90 },
    { title: 'Đợt', dataIndex: 'admission_round', width: 100 },
    { title: 'Trạng thái hồ sơ', dataIndex: 'application_status', width: 140, render: statusTag },
    { title: 'Tổng điểm', dataIndex: 'total_score', align: 'center', width: 110 },
    { title: 'Kết quả', dataIndex: 'result', width: 140, render: resultTag },
    { title: 'Thao tác', fixed: 'right', width: 170, render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openEdit(r)}>Sửa</Button><Popconfirm title="Xóa hồ sơ này?" onConfirm={() => remove(r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  return <>
    <h1 className="page-title">Tuyển sinh</h1>
    <div className="page-subtitle">Quản lý hồ sơ tuyển sinh thạc sĩ, tiến sĩ, trạng thái xét tuyển và kết quả trúng tuyển.</div>

    <div className="stat-grid">
      <Card className="stat-card"><div className="muted">Tổng hồ sơ</div><h2>{stats.total}</h2></Card>
      <Card className="stat-card"><div className="muted">Thạc sĩ</div><h2>{stats.master}</h2></Card>
      <Card className="stat-card"><div className="muted">Tiến sĩ</div><h2>{stats.phd}</h2></Card>
      <Card className="stat-card"><div className="muted">Trúng tuyển</div><h2>{stats.admitted}</h2></Card>
    </div>

    <Card className="toolbar-card" style={{ marginBottom: 16 }}>
      <div className="toolbar">
        <Input prefix={<SearchOutlined />} placeholder="Tìm hồ sơ, họ tên, email, điện thoại..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ maxWidth: 420 }} />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv('tuyen-sinh.csv', filtered)}>Xuất CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm hồ sơ</Button>
        </Space>
      </div>
    </Card>

    <Card className="table-card">
      <Table rowKey="id" loading={loading} columns={columns} dataSource={filtered} scroll={{ x: 1600 }} pagination={{ pageSize: 8 }} />
    </Card>

    <Modal title={editing ? 'Cập nhật hồ sơ tuyển sinh' : 'Thêm hồ sơ tuyển sinh'} open={open} onCancel={() => setOpen(false)} onOk={save} okText="Lưu" cancelText="Hủy" width={850}>
      <Form form={form} layout="vertical">
        <div className="form-grid">
          <Form.Item name="code" label="Mã hồ sơ" rules={[{ required: true, message: 'Nhập mã hồ sơ' }]}><Input placeholder="VD: TS2026-001" /></Form.Item>
          <Form.Item name="full_name" label="Họ và tên" rules={[{ required: true, message: 'Nhập họ tên' }]}><Input /></Form.Item>
          <Form.Item name="email" label="Email"><Input /></Form.Item>
          <Form.Item name="phone" label="Điện thoại"><Input /></Form.Item>
          <Form.Item name="candidate_type" label="Bậc tuyển sinh"><Select options={[{ value: 'Thạc sĩ' }, { value: 'Tiến sĩ' }]} /></Form.Item>
          <Form.Item name="program_id" label="Chương trình đào tạo"><Select allowClear showSearch optionFilterProp="label" options={programs.map((p) => ({ value: p.id, label: programName(p.id) || String(p.id) }))} /></Form.Item>
          <Form.Item name="intake_year" label="Năm tuyển sinh"><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="admission_round" label="Đợt tuyển sinh"><Select options={[{ value: 'Đợt 1' }, { value: 'Đợt 2' }, { value: 'Đợt bổ sung' }]} /></Form.Item>
          <Form.Item name="application_status" label="Trạng thái hồ sơ"><Select options={[{ value: 'new', label: 'Mới' }, { value: 'reviewing', label: 'Đang xét' }, { value: 'approved', label: 'Đã duyệt' }, { value: 'rejected', label: 'Từ chối' }]} /></Form.Item>
          <Form.Item name="result" label="Kết quả"><Select options={[{ value: 'pending', label: 'Chờ kết quả' }, { value: 'admitted', label: 'Trúng tuyển' }, { value: 'failed', label: 'Không trúng tuyển' }, { value: 'reserved', label: 'Bảo lưu' }]} /></Form.Item>
          <Form.Item name="exam_score" label="Điểm thi/xét tuyển"><InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="interview_score" label="Điểm phỏng vấn"><InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="total_score" label="Tổng điểm"><InputNumber min={0} max={200} step={0.1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={3} /></Form.Item>
        </div>
      </Form>
    </Modal>
  </>
}
