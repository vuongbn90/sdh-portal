import { DeleteOutlined, DownloadOutlined, EditOutlined, MailOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const tableName = 'notifications'
const logTable = 'notification_logs'

function dateValue(value) {
  return value ? dayjs(value) : null
}

function dateString(value) {
  if (!value) return null
  return dayjs(value).toISOString()
}

function pick(row, keys, fallback = '') {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  }
  return fallback
}

export default function NotificationsPage() {
  const [rows, setRows] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState(null)
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

    const { data: logData } = await supabase
      .from(logTable)
      .select('*')
      .order('created_at', { ascending: false })

    setLogs(logData || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [rows, keyword])

  const stats = useMemo(() => {
    return {
      total: rows.length,
      draft: rows.filter((r) => pick(r, ['status'], '') === 'draft').length,
      sent: rows.filter((r) => pick(r, ['status'], '') === 'sent').length,
      scheduled: rows.filter((r) => pick(r, ['status'], '') === 'scheduled').length,
    }
  }, [rows])

  const openCreate = () => {
    setEditing(null)
    form.setFieldsValue({
      code: '',
      title: '',
      content: '',
      target_type: 'all',
      target_group: 'all',
      receiver_email: '',
      send_email: true,
      send_system: true,
      send_time: null,
      status: 'draft',
      note: '',
    })
    setOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({
      code: pick(record, ['code'], ''),
      title: pick(record, ['title'], ''),
      content: pick(record, ['content'], ''),
      target_type: pick(record, ['target_type'], 'all'),
      target_group: pick(record, ['target_group'], 'all'),
      receiver_email: pick(record, ['receiver_email'], ''),
      send_email: pick(record, ['send_email'], true),
      send_system: pick(record, ['send_system'], true),
      send_time: dateValue(pick(record, ['send_time'], null)),
      status: pick(record, ['status'], 'draft'),
      note: pick(record, ['note'], ''),
    })
    setOpen(true)
  }

  const save = async () => {
    const values = await form.validateFields()

    const payload = {
      code: values.code,
      title: values.title,
      content: values.content,
      target_type: values.target_type,
      target_group: values.target_group,
      receiver_email: values.receiver_email || '',
      send_email: values.send_email,
      send_system: values.send_system,
      send_time: dateString(values.send_time),
      status: values.status,
      note: values.note || '',
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
    message.success(editing ? 'Đã cập nhật thông báo' : 'Đã thêm thông báo')
    setOpen(false)
    load()
  }

  const remove = async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa thông báo')
    load()
  }

  const markSent = async (record) => {
    const { error } = await supabase
      .from(tableName)
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', record.id)

    if (error) return message.error(error.message)

    await supabase.from(logTable).insert([
      {
        notification_id: record.id,
        receiver_email: record.receiver_email || '',
        receiver_name: record.target_group || record.target_type || '',
        send_status: 'sent',
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ])

    message.success('Đã đánh dấu đã gửi')
    load()
  }

  const openLogs = (record) => {
    setSelected(record)
    setLogOpen(true)
  }

  const selectedLogs = logs.filter((x) => x.notification_id === selected?.id)

  const columns = [
    { title: 'Mã', dataIndex: 'code', render: (v) => <b>{v}</b> },
    { title: 'Tiêu đề', dataIndex: 'title' },
    { title: 'Đối tượng', dataIndex: 'target_group', render: (_, r) => pick(r, ['target_group', 'target_type'], 'all') },
    { title: 'Email', dataIndex: 'send_email', render: (v) => v ? <Tag color="green">Có</Tag> : <Tag>Không</Tag> },
    { title: 'Thời gian gửi', dataIndex: 'send_time', render: (v) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '' },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'sent' ? 'green' : v === 'scheduled' ? 'blue' : 'gold'}>{v || 'draft'}</Tag> },
    {
      title: 'Thao tác',
      fixed: 'right',
      render: (_, r) => (
        <Space>
          <Button icon={<MailOutlined />} onClick={() => markSent(r)}>Đã gửi</Button>
          <Button onClick={() => openLogs(r)}>Log</Button>
          <Button icon={<EditOutlined />} onClick={() => openEdit(r)}>Sửa</Button>
          <Popconfirm title="Xóa thông báo này?" onConfirm={() => remove(r.id)}>
            <Button danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const logColumns = [
    { title: 'Email nhận', dataIndex: 'receiver_email' },
    { title: 'Người nhận', dataIndex: 'receiver_name' },
    { title: 'Trạng thái', dataIndex: 'send_status', render: (v) => <Tag color={v === 'sent' ? 'green' : 'red'}>{v}</Tag> },
    { title: 'Thời gian', dataIndex: 'sent_at', render: (v) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '' },
    { title: 'Lỗi', dataIndex: 'error_message' },
  ]

  return (
    <>
      <h1 className="page-title">Thông báo & Email</h1>
      <div className="page-subtitle">Quản lý thông báo nội bộ và email gửi cho học viên, NCS, giảng viên</div>

      <div className="stat-grid">
        <Card className="stat-card"><div className="muted">Tổng thông báo</div><h2>{stats.total}</h2></Card>
        <Card className="stat-card"><div className="muted">Bản nháp</div><h2>{stats.draft}</h2></Card>
        <Card className="stat-card"><div className="muted">Đã lên lịch</div><h2>{stats.scheduled}</h2></Card>
        <Card className="stat-card"><div className="muted">Đã gửi</div><h2>{stats.sent}</h2></Card>
      </div>

      <Card className="toolbar-card" style={{ marginBottom: 16 }}>
        <div className="toolbar">
          <Input prefix={<SearchOutlined />} placeholder="Tìm tiêu đề, nội dung, đối tượng..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ maxWidth: 420 }} />
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
            <Button icon={<DownloadOutlined />} onClick={() => exportCsv('thong-bao-email.csv', filtered)}>Xuất CSV</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm thông báo</Button>
          </Space>
        </div>
      </Card>

      <Card className="table-card">
        <Table rowKey="id" loading={loading} columns={columns} dataSource={filtered} scroll={{ x: 1300 }} pagination={{ pageSize: 8 }} />
      </Card>

      <Modal title={editing ? 'Cập nhật thông báo' : 'Thêm thông báo'} open={open} onCancel={() => setOpen(false)} onOk={save} okText="Lưu" cancelText="Hủy" width={860}>
        <Form form={form} layout="vertical">
          <div className="form-grid">
            <Form.Item name="code" label="Mã thông báo"><Input placeholder="VD: TB-001" /></Form.Item>
            <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'draft', label: 'Nháp' }, { value: 'scheduled', label: 'Đã lên lịch' }, { value: 'sent', label: 'Đã gửi' }]} /></Form.Item>
            <Form.Item name="title" label="Tiêu đề" className="full" rules={[{ required: true, message: 'Nhập tiêu đề' }]}><Input /></Form.Item>
            <Form.Item name="content" label="Nội dung" className="full" rules={[{ required: true, message: 'Nhập nội dung' }]}><Input.TextArea rows={5} /></Form.Item>
            <Form.Item name="target_type" label="Loại đối tượng"><Select options={[{ value: 'all', label: 'Tất cả' }, { value: 'students', label: 'Học viên' }, { value: 'phd_students', label: 'NCS' }, { value: 'faculty', label: 'Giảng viên' }]} /></Form.Item>
            <Form.Item name="target_group" label="Nhóm nhận"><Select options={[{ value: 'all', label: 'Tất cả' }, { value: 'students', label: 'Học viên cao học' }, { value: 'phd_students', label: 'Nghiên cứu sinh' }, { value: 'faculty', label: 'Giảng viên' }]} /></Form.Item>
            <Form.Item name="receiver_email" label="Email nhận cụ thể" className="full"><Input placeholder="Có thể nhập một email cụ thể để thử nghiệm" /></Form.Item>
            <Form.Item name="send_email" label="Gửi email" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="send_system" label="Thông báo hệ thống" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="send_time" label="Thời gian gửi" className="full"><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={3} /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title={`Lịch sử gửi: ${selected?.title || ''}`} open={logOpen} onCancel={() => setLogOpen(false)} footer={null} width={900}>
        <Table rowKey="id" columns={logColumns} dataSource={selectedLogs} pagination={false} />
      </Modal>
    </>
  )
}
