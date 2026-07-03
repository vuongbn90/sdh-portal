import { DeleteOutlined, DownloadOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const tableName = 'defense_schedules'

const emptySchedule = {
  schedule_code: '',
  title: '',
  council_id: null,
  thesis_id: null,
  defense_date: null,
  defense_time: '',
  end_time: '',
  room: '',
  location: '',
  online_link: '',
  status: 'scheduled',
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

export default function DefenseSchedulePage() {
  const [rows, setRows] = useState([])
  const [councils, setCouncils] = useState([])
  const [theses, setTheses] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.from(tableName).select('*').order('defense_date', { ascending: false })
    if (error) message.error(error.message)
    setRows(data || [])

    const { data: councilData } = await supabase.from('councils').select('*').order('created_at', { ascending: false })
    setCouncils(councilData || [])

    const { data: thesisData } = await supabase.from('theses').select('*').order('created_at', { ascending: false })
    setTheses(thesisData || [])

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
    const scheduled = rows.filter((r) => pick(r, ['status'], 'scheduled') === 'scheduled').length
    const completed = rows.filter((r) => pick(r, ['status'], '') === 'completed').length
    const postponed = rows.filter((r) => pick(r, ['status'], '') === 'postponed').length
    return { total, scheduled, completed, postponed }
  }, [rows])

  const councilName = (id) => {
    const c = councils.find((x) => x.id === id)
    return pick(c, ['council_name', 'name', 'code', 'council_code'], '')
  }

  const thesisName = (id) => {
    const t = theses.find((x) => x.id === id)
    return pick(t, ['title', 'name', 'code'], '')
  }

  const openCreate = () => {
    setEditing(null)
    form.setFieldsValue(emptySchedule)
    setOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({
      schedule_code: pick(record, ['schedule_code', 'code'], ''),
      title: pick(record, ['title', 'name'], ''),
      council_id: pick(record, ['council_id'], null),
      thesis_id: pick(record, ['thesis_id'], null),
      defense_date: toDateValue(pick(record, ['defense_date'], null)),
      defense_time: pick(record, ['defense_time', 'start_time'], ''),
      end_time: pick(record, ['end_time'], ''),
      room: pick(record, ['room'], ''),
      location: pick(record, ['location'], ''),
      online_link: pick(record, ['online_link'], ''),
      status: pick(record, ['status'], 'scheduled'),
      note: pick(record, ['note'], ''),
    })
    setOpen(true)
  }

  const save = async () => {
    const values = await form.validateFields()
    const payload = {
      code: values.schedule_code,
      name: values.title || values.schedule_code,
      schedule_code: values.schedule_code,
      title: values.title || values.schedule_code,
      council_id: values.council_id || null,
      thesis_id: values.thesis_id || null,
      defense_date: dateString(values.defense_date),
      defense_time: values.defense_time || '',
      start_time: values.defense_time || null,
      end_time: values.end_time || '',
      room: values.room || '',
      location: values.location || '',
      online_link: values.online_link || '',
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
    message.success(editing ? 'Đã cập nhật lịch bảo vệ' : 'Đã thêm lịch bảo vệ')
    setOpen(false)
    load()
  }

  const remove = async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa lịch bảo vệ')
    load()
  }

  const columns = [
    { title: 'Mã lịch', dataIndex: 'schedule_code', render: (_, r) => <b>{pick(r, ['schedule_code', 'code'])}</b> },
    { title: 'Tiêu đề', dataIndex: 'title', render: (_, r) => pick(r, ['title', 'name']) },
    { title: 'Hội đồng', dataIndex: 'council_id', render: (_, r) => councilName(r.council_id) || <span className="muted">Chưa gán</span> },
    { title: 'Luận văn/Luận án', dataIndex: 'thesis_id', render: (_, r) => thesisName(r.thesis_id) || <span className="muted">Chưa gán</span> },
    { title: 'Ngày', dataIndex: 'defense_date' },
    { title: 'Giờ', dataIndex: 'defense_time', render: (_, r) => pick(r, ['defense_time', 'start_time']) },
    { title: 'Phòng', dataIndex: 'room' },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'completed' ? 'green' : v === 'postponed' ? 'red' : 'blue'}>{v || 'scheduled'}</Tag> },
    { title: 'Thao tác', fixed: 'right', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openEdit(r)}>Sửa</Button><Popconfirm title="Xóa lịch này?" onConfirm={() => remove(r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  return <>
    <h1 className="page-title">Lịch bảo vệ</h1>
    <div className="page-subtitle">Quản lý lịch bảo vệ luận văn, luận án, phòng bảo vệ và link trực tuyến</div>

    <div className="stat-grid">
      <Card className="stat-card"><div className="muted">Tổng lịch</div><h2>{stats.total}</h2></Card>
      <Card className="stat-card"><div className="muted">Đã lên lịch</div><h2>{stats.scheduled}</h2></Card>
      <Card className="stat-card"><div className="muted">Hoàn thành</div><h2>{stats.completed}</h2></Card>
      <Card className="stat-card"><div className="muted">Hoãn</div><h2>{stats.postponed}</h2></Card>
    </div>

    <Card className="toolbar-card" style={{ marginBottom: 16 }}>
      <div className="toolbar">
        <Input prefix={<SearchOutlined />} placeholder="Tìm mã lịch, hội đồng, phòng..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ maxWidth: 420 }} />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv('lich-bao-ve.csv', filtered)}>Xuất CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm lịch</Button>
        </Space>
      </div>
    </Card>

    <Card className="table-card">
      <Table rowKey="id" loading={loading} columns={columns} dataSource={filtered} scroll={{ x: 1300 }} pagination={{ pageSize: 8 }} />
    </Card>

    <Modal title={editing ? 'Cập nhật lịch bảo vệ' : 'Thêm lịch bảo vệ'} open={open} onCancel={() => setOpen(false)} onOk={save} okText="Lưu" cancelText="Hủy" width={860}>
      <Form form={form} layout="vertical">
        <div className="form-grid">
          <Form.Item name="schedule_code" label="Mã lịch" rules={[{ required: true, message: 'Nhập mã lịch' }]}><Input placeholder="VD: LBV-001" /></Form.Item>
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Nhập tiêu đề' }]}><Input placeholder="VD: Lịch bảo vệ luận văn MBA K31" /></Form.Item>
          <Form.Item name="council_id" label="Hội đồng"><Select allowClear showSearch placeholder="Chọn hội đồng" optionFilterProp="label" options={councils.map((c) => ({ value: c.id, label: councilName(c.id) || c.id }))} /></Form.Item>
          <Form.Item name="thesis_id" label="Luận văn/Luận án"><Select allowClear showSearch placeholder="Chọn luận văn/luận án" optionFilterProp="label" options={theses.map((t) => ({ value: t.id, label: thesisName(t.id) || t.id }))} /></Form.Item>
          <Form.Item name="defense_date" label="Ngày bảo vệ" rules={[{ required: true, message: 'Chọn ngày bảo vệ' }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="defense_time" label="Giờ bắt đầu"><Input placeholder="VD: 08:00" /></Form.Item>
          <Form.Item name="end_time" label="Giờ kết thúc"><Input placeholder="VD: 10:00" /></Form.Item>
          <Form.Item name="room" label="Phòng"><Input placeholder="VD: A101" /></Form.Item>
          <Form.Item name="location" label="Địa điểm"><Input placeholder="VD: Học viện Hàng không Việt Nam" /></Form.Item>
          <Form.Item name="online_link" label="Link trực tuyến"><Input placeholder="Zoom/Google Meet" /></Form.Item>
          <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'scheduled', label: 'Đã lên lịch' }, { value: 'completed', label: 'Hoàn thành' }, { value: 'postponed', label: 'Hoãn' }, { value: 'cancelled', label: 'Hủy' }]} /></Form.Item>
          <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={3} /></Form.Item>
        </div>
      </Form>
    </Modal>
  </>
}
