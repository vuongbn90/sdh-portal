import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SolutionOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Form,
  Input,
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
const { TextArea } = Input

const STATUS_OPTIONS = [
  { label: 'Đang học', value: 'studying' },
  { label: 'Bảo lưu', value: 'paused' },
  { label: 'Đã bảo vệ', value: 'defended' },
  { label: 'Tốt nghiệp', value: 'graduated' },
  { label: 'Thôi học', value: 'withdrawn' },
]

const COHORT_OPTIONS = ['2024', '2025', '2026', '2027', '2028'].map((year) => ({ label: year, value: year }))

function normalizeText(value) {
  return String(value || '').toLowerCase().trim()
}

function statusTag(status) {
  const label = STATUS_OPTIONS.find((item) => item.value === status)?.label || status || '—'
  const colorMap = {
    studying: 'green',
    paused: 'orange',
    defended: 'blue',
    graduated: 'purple',
    withdrawn: 'red',
  }
  return <Tag color={colorMap[status] || 'default'}>{label}</Tag>
}

function exportCsv(rows) {
  const headers = ['phd_code', 'full_name', 'email', 'phone', 'cohort', 'status', 'research_direction']
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((key) => `"${String(row[key] ?? '').replaceAll('"', '""')}"`).join(',')),
  ].join('\n')

  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'danh-sach-nghien-cuu-sinh.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function PhDStudentsPage() {
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
      .from('phd_students')
      .select('id,phd_code,full_name,email,phone,cohort,status,research_direction,created_at')
      .order('phd_code', { ascending: true })

    if (error) {
      message.error(`Không đọc được dữ liệu nghiên cứu sinh: ${error.message}`)
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
      [row.phd_code, row.full_name, row.email, row.phone, row.cohort, row.status, row.research_direction]
        .map(normalizeText)
        .some((value) => value.includes(q)),
    )
  }, [rows, keyword])

  const openCreate = () => {
    setEditingRecord(null)
    form.resetFields()
    form.setFieldsValue({ status: 'studying', cohort: '2026' })
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
        phd_code: values.phd_code?.trim(),
        full_name: values.full_name?.trim(),
        email: values.email?.trim() || null,
        phone: values.phone?.trim() || null,
        cohort: values.cohort || null,
        status: values.status || 'studying',
        research_direction: values.research_direction?.trim() || null,
        updated_at: new Date().toISOString(),
      }

      const query = editingRecord
        ? supabase.from('phd_students').update(payload).eq('id', editingRecord.id)
        : supabase.from('phd_students').insert(payload)

      const { error } = await query

      if (error) {
        message.error(`Không lưu được: ${error.message}`)
      } else {
        message.success(editingRecord ? 'Đã cập nhật nghiên cứu sinh' : 'Đã thêm nghiên cứu sinh')
        setModalOpen(false)
        loadData()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (record) => {
    const { error } = await supabase.from('phd_students').delete().eq('id', record.id)
    if (error) {
      message.error(`Không xóa được: ${error.message}`)
    } else {
      message.success('Đã xóa nghiên cứu sinh')
      loadData()
    }
  }

  const columns = [
    {
      title: 'Mã NCS',
      dataIndex: 'phd_code',
      width: 120,
      fixed: 'left',
      sorter: (a, b) => String(a.phd_code).localeCompare(String(b.phd_code)),
    },
    {
      title: 'Họ tên',
      dataIndex: 'full_name',
      width: 230,
      fixed: 'left',
      render: (value) => <b>{value}</b>,
      sorter: (a, b) => String(a.full_name).localeCompare(String(b.full_name), 'vi'),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      width: 230,
      ellipsis: true,
      render: (value) => value || <Text type="secondary">—</Text>,
    },
    {
      title: 'Điện thoại',
      dataIndex: 'phone',
      width: 140,
      render: (value) => value || <Text type="secondary">—</Text>,
    },
    {
      title: 'Khóa',
      dataIndex: 'cohort',
      width: 110,
      filters: COHORT_OPTIONS.map((item) => ({ text: item.label, value: item.value })),
      onFilter: (value, record) => record.cohort === value,
    },
    {
      title: 'Hướng nghiên cứu',
      dataIndex: 'research_direction',
      width: 300,
      ellipsis: true,
      render: (value) => value || <Text type="secondary">Chưa cập nhật</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 140,
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
            title="Xóa nghiên cứu sinh?"
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
          <Title level={2}>Quản lý nghiên cứu sinh</Title>
          <Text type="secondary">Quản lý thông tin NCS, khóa tuyển sinh, trạng thái và hướng nghiên cứu.</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm NCS
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <Card bordered={false} className="mini-stat-card">
            <SolutionOutlined className="mini-stat-icon" />
            <div>
              <Text type="secondary">Tổng NCS</Text>
              <div className="mini-stat-value">{rows.length}</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false} className="mini-stat-card">
            <SolutionOutlined className="mini-stat-icon" />
            <div>
              <Text type="secondary">Đang học</Text>
              <div className="mini-stat-value">{rows.filter((r) => r.status === 'studying').length}</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false} className="mini-stat-card">
            <FileTextOutlined className="mini-stat-icon" />
            <div>
              <Text type="secondary">Đã bảo vệ / Tốt nghiệp</Text>
              <div className="mini-stat-value">{rows.filter((r) => ['defended', 'graduated'].includes(r.status)).length}</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card bordered={false}>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tìm theo mã NCS, họ tên, email, khóa..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 390 }}
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
          scroll={{ x: 1400 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title={editingRecord ? 'Cập nhật nghiên cứu sinh' : 'Thêm nghiên cứu sinh'}
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
                name="phd_code"
                label="Mã NCS"
                rules={[{ required: true, message: 'Vui lòng nhập mã NCS' }]}
              >
                <Input placeholder="VD: NCS001" />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item
                name="full_name"
                label="Họ và tên"
                rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
              >
                <Input placeholder="VD: Nguyễn Văn A" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="cohort" label="Khóa">
                <Select allowClear options={COHORT_OPTIONS} placeholder="Chọn khóa" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="status" label="Trạng thái">
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="email"
                label="Email"
                rules={[{ type: 'email', message: 'Email chưa đúng định dạng' }]}
              >
                <Input placeholder="ncs@vaa.edu.vn" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="phone" label="Điện thoại">
                <Input placeholder="Số điện thoại" />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item name="research_direction" label="Hướng nghiên cứu">
                <TextArea rows={3} placeholder="VD: Quản trị nguồn nhân lực trong hàng không" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
