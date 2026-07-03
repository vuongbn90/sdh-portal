import { DeleteOutlined, DownloadOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, DatePicker, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const tableName = 'forms'

const emptyForm = {
  code: '',
  name: '',
  category: 'Biểu mẫu',
  form_type: 'file',
  file_url: '',
  effective_date: null,
  status: 'active',
  description: '',
  note: '',
}

function pick(row, keys, fallback = '') {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  return fallback
}

function toDateValue(value) {
  return value ? dayjs(value) : null
}

function dateString(value) {
  if (!value) return null
  return dayjs(value).format('YYYY-MM-DD')
}

export default function FormsPage() {
  const [rows, setRows] = useState([])
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
    const active = rows.filter((r) => pick(r, ['status'], 'active') === 'active').length
    const decision = rows.filter((r) => String(pick(r, ['category'], '')).toLowerCase().includes('quyết')).length
    const template = rows.filter((r) => String(pick(r, ['category'], '')).toLowerCase().includes('biểu')).length
    return { total, active, decision, template }
  }, [rows])

  const openCreate = () => {
    setEditing(null)
    form.setFieldsValue(emptyForm)
    setOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({
      code: pick(record, ['code', 'form_code'], ''),
      name: pick(record, ['name', 'form_name', 'title'], ''),
      category: pick(record, ['category'], 'Biểu mẫu'),
      form_type: pick(record, ['form_type', 'type'], 'file'),
      file_url: pick(record, ['file_url'], ''),
      effective_date: toDateValue(pick(record, ['effective_date'], null)),
      status: pick(record, ['status'], 'active'),
      description: pick(record, ['description', 'content'], ''),
      note: pick(record, ['note'], ''),
    })
    setOpen(true)
  }

  const save = async () => {
    const values = await form.validateFields()
    const payload = {
      code: values.code,
      name: values.name,
      category: values.category,
      form_type: values.form_type,
      type: values.form_type,
      file_url: values.file_url || '',
      effective_date: dateString(values.effective_date),
      status: values.status,
      description: values.description || '',
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
    message.success(editing ? 'Đã cập nhật biểu mẫu' : 'Đã thêm biểu mẫu')
    setOpen(false)
    load()
  }

  const remove = async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa biểu mẫu')
    load()
  }

  const columns = [
    { title: 'Mã', dataIndex: 'code', render: (_, r) => <b>{pick(r, ['code', 'form_code'])}</b> },
    { title: 'Tên biểu mẫu', dataIndex: 'name', render: (_, r) => pick(r, ['name', 'form_name', 'title']) },
    { title: 'Nhóm', dataIndex: 'category', render: (v) => <Tag color="blue">{v || 'Biểu mẫu'}</Tag> },
    { title: 'Loại', dataIndex: 'form_type', render: (_, r) => <Tag>{pick(r, ['form_type', 'type'], 'file')}</Tag> },
    { title: 'Hiệu lực', dataIndex: 'effective_date' },
    { title: 'File/Link', dataIndex: 'file_url', render: (v) => v ? <a href={v} target="_blank" rel="noreferrer">Mở file</a> : <span className="muted">Chưa có</span> },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'active' ? 'green' : 'default'}>{v || 'active'}</Tag> },
    { title: 'Thao tác', fixed: 'right', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openEdit(r)}>Sửa</Button><Popconfirm title="Xóa biểu mẫu này?" onConfirm={() => remove(r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  return <>
    <h1 className="page-title">Biểu mẫu & Quyết định</h1>
    <div className="page-subtitle">Quản lý biểu mẫu, quyết định, biên bản, hướng dẫn và các tài liệu phục vụ đào tạo sau đại học</div>

    <div className="stat-grid">
      <Card className="stat-card"><div className="muted">Tổng tài liệu</div><h2>{stats.total}</h2></Card>
      <Card className="stat-card"><div className="muted">Đang hiệu lực</div><h2>{stats.active}</h2></Card>
      <Card className="stat-card"><div className="muted">Quyết định</div><h2>{stats.decision}</h2></Card>
      <Card className="stat-card"><div className="muted">Biểu mẫu</div><h2>{stats.template}</h2></Card>
    </div>

    <Card className="toolbar-card" style={{ marginBottom: 16 }}>
      <div className="toolbar">
        <Input prefix={<SearchOutlined />} placeholder="Tìm mã, tên biểu mẫu, nhóm tài liệu..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ maxWidth: 420 }} />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv('bieu-mau.csv', filtered)}>Xuất CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm biểu mẫu</Button>
        </Space>
      </div>
    </Card>

    <Card className="table-card">
      <Table rowKey="id" loading={loading} columns={columns} dataSource={filtered} scroll={{ x: 1200 }} pagination={{ pageSize: 8 }} />
    </Card>

    <Modal title={editing ? 'Cập nhật biểu mẫu' : 'Thêm biểu mẫu'} open={open} onCancel={() => setOpen(false)} onOk={save} okText="Lưu" cancelText="Hủy" width={820}>
      <Form form={form} layout="vertical">
        <div className="form-grid">
          <Form.Item name="code" label="Mã biểu mẫu" rules={[{ required: true, message: 'Nhập mã biểu mẫu' }]}><Input placeholder="VD: BM-SDH-01" /></Form.Item>
          <Form.Item name="name" label="Tên biểu mẫu" rules={[{ required: true, message: 'Nhập tên biểu mẫu' }]}><Input placeholder="VD: Đơn đăng ký bảo vệ luận văn" /></Form.Item>
          <Form.Item name="category" label="Nhóm tài liệu"><Select options={[{ value: 'Biểu mẫu' }, { value: 'Quyết định' }, { value: 'Biên bản' }, { value: 'Hướng dẫn' }, { value: 'Thông báo' }]} /></Form.Item>
          <Form.Item name="form_type" label="Loại"><Select options={[{ value: 'file', label: 'File' }, { value: 'link', label: 'Link' }, { value: 'template', label: 'Mẫu nhập liệu' }]} /></Form.Item>
          <Form.Item name="effective_date" label="Ngày hiệu lực"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'active', label: 'Đang hiệu lực' }, { value: 'inactive', label: 'Ngưng hiệu lực' }, { value: 'draft', label: 'Bản nháp' }]} /></Form.Item>
          <Form.Item name="file_url" label="Link file" className="full"><Input placeholder="Dán link Google Drive/Supabase Storage" /></Form.Item>
          <Form.Item name="description" label="Mô tả" className="full"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={2} /></Form.Item>
        </div>
      </Form>
    </Modal>
  </>
}
