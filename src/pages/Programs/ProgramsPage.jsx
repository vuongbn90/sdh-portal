import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  BankOutlined,
  BookOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'

const { Title, Text } = Typography

const LEVEL_OPTIONS = [
  { label: 'Thạc sĩ', value: 'Master' },
  { label: 'Tiến sĩ', value: 'PhD' },
]

const STATUS_OPTIONS = [
  { label: 'Đang đào tạo', value: 'active' },
  { label: 'Tạm dừng', value: 'paused' },
  { label: 'Ngưng tuyển sinh', value: 'closed' },
]

function normalizeText(value) {
  return String(value || '').toLowerCase().trim()
}

function levelLabel(value) {
  return LEVEL_OPTIONS.find((item) => item.value === value)?.label || value || '—'
}

function statusTag(status) {
  const label = STATUS_OPTIONS.find((item) => item.value === status)?.label || status || '—'
  const colorMap = {
    active: 'green',
    paused: 'orange',
    closed: 'red',
  }
  return <Tag color={colorMap[status] || 'default'}>{label}</Tag>
}

function exportCsv(rows) {
  const headers = ['code', 'name', 'level', 'major', 'credits', 'duration_months', 'status']
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((key) => `"${String(row[key] ?? '').replaceAll('"', '""')}"`).join(',')),
  ].join('\n')

  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'chuong-trinh-dao-tao.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function ProgramsPage() {
  const [form] = Form.useForm()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)

  const loadData = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('programs')
      .select('id,code,name,level,major,credits,duration_months,status,created_at,updated_at')
      .order('level', { ascending: true })
      .order('code', { ascending: true })

    if (error) {
      message.error(`Không đọc được dữ liệu chương trình: ${error.message}`)
      setRows([])
    } else {
      setRows(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredRows = useMemo(() => {
    const q = normalizeText(keyword)
    if (!q) return rows
    return rows.filter((row) =>
      [row.code, row.name, row.level, row.major, row.credits, row.duration_months, row.status]
        .map(normalizeText)
        .some((value) => value.includes(q)),
    )
  }, [rows, keyword])

  const openCreate = () => {
    setEditingRecord(null)
    form.resetFields()
    form.setFieldsValue({ level: 'Master', status: 'active', credits: 60, duration_months: 24 })
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditingRecord(record)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      const payload = {
        code: values.code?.trim(),
        name: values.name?.trim(),
        level: values.level,
        major: values.major?.trim() || null,
        credits: values.credits ?? null,
        duration_months: values.duration_months ?? null,
        status: values.status || 'active',
        updated_at: new Date().toISOString(),
      }

      const query = editingRecord
        ? supabase.from('programs').update(payload).eq('id', editingRecord.id)
        : supabase.from('programs').insert(payload)

      const { error } = await query

      if (error) {
        message.error(`Không lưu được: ${error.message}`)
      } else {
        message.success(editingRecord ? 'Đã cập nhật chương trình' : 'Đã thêm chương trình')
        setModalOpen(false)
        loadData()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (record) => {
    const { error } = await supabase.from('programs').delete().eq('id', record.id)
    if (error) {
      message.error(`Không xóa được: ${error.message}`)
    } else {
      message.success('Đã xóa chương trình')
      loadData()
    }
  }

  const columns = [
    {
      title: 'Mã CTĐT',
      dataIndex: 'code',
      width: 140,
      fixed: 'left',
      sorter: (a, b) => String(a.code).localeCompare(String(b.code)),
    },
    {
      title: 'Tên chương trình',
      dataIndex: 'name',
      width: 300,
      fixed: 'left',
      render: (value) => <b>{value}</b>,
      sorter: (a, b) => String(a.name).localeCompare(String(b.name), 'vi'),
    },
    {
      title: 'Bậc đào tạo',
      dataIndex: 'level',
      width: 130,
      render: levelLabel,
      filters: LEVEL_OPTIONS.map((item) => ({ text: item.label, value: item.value })),
      onFilter: (value, record) => record.level === value,
    },
    {
      title: 'Ngành',
      dataIndex: 'major',
      width: 220,
      render: (value) => value || <Text type="secondary">—</Text>,
    },
    {
      title: 'Tín chỉ',
      dataIndex: 'credits',
      width: 100,
      align: 'center',
      sorter: (a, b) => Number(a.credits || 0) - Number(b.credits || 0),
    },
    {
      title: 'Thời gian',
      dataIndex: 'duration_months',
      width: 130,
      align: 'center',
      render: (value) => (value ? `${value} tháng` : <Text type="secondary">—</Text>),
      sorter: (a, b) => Number(a.duration_months || 0) - Number(b.duration_months || 0),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 150,
      render: statusTag,
      filters: STATUS_OPTIONS.map((item) => ({ text: item.label, value: item.value })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa chương trình?"
            description="Thao tác này không thể hoàn tác."
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record)}
          >
            <Button danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="page-header-row">
        <div>
          <Title level={2}>Quản lý chương trình đào tạo</Title>
          <Text type="secondary">Quản lý CTĐT thạc sĩ, tiến sĩ, số tín chỉ, thời gian đào tạo và trạng thái tuyển sinh.</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm chương trình
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={6}>
          <Card bordered={false} className="mini-stat-card">
            <BankOutlined className="mini-stat-icon" />
            <div>
              <Text type="secondary">Tổng CTĐT</Text>
              <div className="mini-stat-value">{rows.length}</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card bordered={false} className="mini-stat-card">
            <BookOutlined className="mini-stat-icon" />
            <div>
              <Text type="secondary">Thạc sĩ</Text>
              <div className="mini-stat-value">{rows.filter((r) => r.level === 'Master').length}</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card bordered={false} className="mini-stat-card">
            <BookOutlined className="mini-stat-icon" />
            <div>
              <Text type="secondary">Tiến sĩ</Text>
              <div className="mini-stat-value">{rows.filter((r) => r.level === 'PhD').length}</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card bordered={false} className="mini-stat-card">
            <BankOutlined className="mini-stat-icon" />
            <div>
              <Text type="secondary">Đang đào tạo</Text>
              <div className="mini-stat-value">{rows.filter((r) => r.status === 'active').length}</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card bordered={false}>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tìm theo mã, tên chương trình, bậc đào tạo, ngành..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 460 }}
          />
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            Tải lại
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv(filteredRows)}>
            Xuất CSV
          </Button>
        </Space>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={filteredRows}
          columns={columns}
          scroll={{ x: 1320 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title={editingRecord ? 'Cập nhật chương trình đào tạo' : 'Thêm chương trình đào tạo'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        okText={editingRecord ? 'Cập nhật' : 'Thêm mới'}
        cancelText="Hủy"
        width={820}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="code"
                label="Mã chương trình"
                rules={[{ required: true, message: 'Vui lòng nhập mã chương trình' }]}
              >
                <Input placeholder="VD: MBA-QTKD" />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item
                name="name"
                label="Tên chương trình"
                rules={[{ required: true, message: 'Vui lòng nhập tên chương trình' }]}
              >
                <Input placeholder="VD: Thạc sĩ Quản trị kinh doanh" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="level"
                label="Bậc đào tạo"
                rules={[{ required: true, message: 'Vui lòng chọn bậc đào tạo' }]}
              >
                <Select options={LEVEL_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item name="major" label="Ngành/chuyên ngành">
                <Input placeholder="VD: Quản trị kinh doanh" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="credits" label="Số tín chỉ">
                <InputNumber min={0} max={300} style={{ width: '100%' }} placeholder="VD: 60" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="duration_months" label="Thời gian đào tạo">
                <InputNumber min={0} max={96} style={{ width: '100%' }} addonAfter="tháng" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="status" label="Trạng thái">
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
