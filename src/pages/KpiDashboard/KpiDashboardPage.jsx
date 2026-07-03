import { DeleteOutlined, DownloadOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, message, Progress } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const tableName = 'kpis'
const historyTable = 'kpi_history'

const emptyKpi = {
  kpi_code: '',
  kpi_name: '',
  category: 'Đào tạo',
  target_value: 100,
  actual_value: 0,
  unit: '%',
  reporting_period: '2026',
  owner: '',
  status: 'active',
  note: '',
}

function numberValue(v) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n : 0
}

function ratio(actual, target) {
  const t = numberValue(target)
  if (!t) return 0
  return Math.min(100, Math.round((numberValue(actual) / t) * 100))
}

function statusColor(status) {
  if (status === 'completed') return 'green'
  if (status === 'warning') return 'gold'
  if (status === 'risk') return 'red'
  return 'blue'
}

export default function KpiDashboardPage() {
  const [rows, setRows] = useState([])
  const [history, setHistory] = useState([])
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

    const { data: hData } = await supabase.from(historyTable).select('*').order('reporting_date', { ascending: false })
    setHistory(hData || [])
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
    const completed = rows.filter((r) => ratio(r.actual_value, r.target_value) >= 100).length
    const warning = rows.filter((r) => ratio(r.actual_value, r.target_value) >= 70 && ratio(r.actual_value, r.target_value) < 100).length
    const risk = rows.filter((r) => ratio(r.actual_value, r.target_value) < 70).length
    const avg = total ? Math.round(rows.reduce((s, r) => s + ratio(r.actual_value, r.target_value), 0) / total) : 0
    return { total, completed, warning, risk, avg }
  }, [rows])

  const categoryData = useMemo(() => {
    const map = {}
    rows.forEach((r) => {
      const key = r.category || 'Khác'
      if (!map[key]) map[key] = { total: 0, actual: 0, target: 0 }
      map[key].total += 1
      map[key].actual += numberValue(r.actual_value)
      map[key].target += numberValue(r.target_value)
    })
    return Object.entries(map).map(([category, v]) => ({
      category,
      total: v.total,
      progress: ratio(v.actual, v.target),
    }))
  }, [rows])

  const openCreate = () => {
    setEditing(null)
    form.setFieldsValue(emptyKpi)
    setOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue(record)
    setOpen(true)
  }

  const save = async () => {
    const values = await form.validateFields()
    const payload = {
      ...values,
      updated_at: new Date().toISOString(),
    }

    let error
    if (editing?.id) {
      const result = await supabase.from(tableName).update(payload).eq('id', editing.id)
      error = result.error
    } else {
      const result = await supabase.from(tableName).insert([{ ...payload, created_at: new Date().toISOString() }])
      error = result.error
    }

    if (error) return message.error(error.message)
    message.success(editing ? 'Đã cập nhật KPI' : 'Đã thêm KPI')
    setOpen(false)
    load()
  }

  const remove = async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa KPI')
    load()
  }

  const columns = [
    { title: 'Mã KPI', dataIndex: 'kpi_code', render: (v) => <b>{v}</b> },
    { title: 'Tên KPI', dataIndex: 'kpi_name' },
    { title: 'Nhóm', dataIndex: 'category', render: (v) => <Tag color="blue">{v}</Tag> },
    { title: 'Kỳ báo cáo', dataIndex: 'reporting_period' },
    { title: 'Mục tiêu', dataIndex: 'target_value', align: 'right', render: (v, r) => `${numberValue(v).toLocaleString()} ${r.unit || ''}` },
    { title: 'Thực hiện', dataIndex: 'actual_value', align: 'right', render: (v, r) => `${numberValue(v).toLocaleString()} ${r.unit || ''}` },
    { title: 'Tiến độ', render: (_, r) => <Progress percent={ratio(r.actual_value, r.target_value)} size="small" /> },
    { title: 'Phụ trách', dataIndex: 'owner' },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={statusColor(v)}>{v || 'active'}</Tag> },
    { title: 'Thao tác', fixed: 'right', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openEdit(r)}>Sửa</Button><Popconfirm title="Xóa KPI này?" onConfirm={() => remove(r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  return <>
    <h1 className="page-title">KPI & Dashboard nâng cao</h1>
    <div className="page-subtitle">Theo dõi chỉ số điều hành sau đại học, tiến độ thực hiện KPI và xuất dữ liệu quản trị</div>

    <div className="stat-grid">
      <Card className="stat-card"><div className="muted">Tổng KPI</div><h2>{stats.total}</h2></Card>
      <Card className="stat-card"><div className="muted">Hoàn thành</div><h2>{stats.completed}</h2></Card>
      <Card className="stat-card"><div className="muted">Cần theo dõi</div><h2>{stats.warning}</h2></Card>
      <Card className="stat-card"><div className="muted">Rủi ro</div><h2>{stats.risk}</h2></Card>
    </div>

    <div className="stat-grid" style={{ marginBottom: 16 }}>
      <Card className="stat-card"><div className="muted">Tiến độ chung</div><Progress percent={stats.avg} /></Card>
      {categoryData.slice(0, 3).map((item) => (
        <Card className="stat-card" key={item.category}><div className="muted">{item.category}</div><Progress percent={item.progress} size="small" /><div style={{ marginTop: 8 }}>{item.total} KPI</div></Card>
      ))}
    </div>

    <Card className="toolbar-card" style={{ marginBottom: 16 }}>
      <div className="toolbar">
        <Input prefix={<SearchOutlined />} placeholder="Tìm KPI, nhóm, kỳ báo cáo..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ maxWidth: 420 }} />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv('kpi-dashboard.csv', filtered)}>Xuất CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm KPI</Button>
        </Space>
      </div>
    </Card>

    <Card className="table-card">
      <Table rowKey="id" loading={loading} columns={columns} dataSource={filtered} scroll={{ x: 1500 }} pagination={{ pageSize: 8 }} />
    </Card>

    <Modal title={editing ? 'Cập nhật KPI' : 'Thêm KPI'} open={open} onCancel={() => setOpen(false)} onOk={save} okText="Lưu" cancelText="Hủy" width={820}>
      <Form form={form} layout="vertical">
        <div className="form-grid">
          <Form.Item name="kpi_code" label="Mã KPI" rules={[{ required: true, message: 'Nhập mã KPI' }]}><Input placeholder="VD: KPI-SDH-001" /></Form.Item>
          <Form.Item name="kpi_name" label="Tên KPI" rules={[{ required: true, message: 'Nhập tên KPI' }]}><Input placeholder="VD: Tỷ lệ NCS đúng tiến độ" /></Form.Item>
          <Form.Item name="category" label="Nhóm KPI"><Select options={[{ value: 'Đào tạo' }, { value: 'Nghiên cứu' }, { value: 'Học phí' }, { value: 'Luận văn/Luận án' }, { value: 'Kiểm định' }, { value: 'Quản trị' }]} /></Form.Item>
          <Form.Item name="reporting_period" label="Kỳ báo cáo"><Input placeholder="VD: 2026, HK1-2026" /></Form.Item>
          <Form.Item name="target_value" label="Mục tiêu"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="actual_value" label="Thực hiện"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="unit" label="Đơn vị"><Select options={[{ value: '%' }, { value: 'người' }, { value: 'hồ sơ' }, { value: 'triệu đồng' }, { value: 'bài' }, { value: 'điểm' }]} /></Form.Item>
          <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'active', label: 'Đang theo dõi' }, { value: 'completed', label: 'Hoàn thành' }, { value: 'warning', label: 'Cần theo dõi' }, { value: 'risk', label: 'Rủi ro' }]} /></Form.Item>
          <Form.Item name="owner" label="Đơn vị phụ trách" className="full"><Input placeholder="VD: Viện Đào tạo Sau đại học" /></Form.Item>
          <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={3} /></Form.Item>
        </div>
      </Form>
    </Modal>
  </>
}
