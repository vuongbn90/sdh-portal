import {
  BookOutlined,
  EditOutlined,
  FileDoneOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../context/AuthContext.jsx'

const { Title, Text } = Typography

function pick(row, keys, fallback = '') {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  }
  return fallback
}

export default function FacultyPortalPage() {
  const { user } = useAuth()

  const currentEmail =
    user?.email ||
    user?.user_email ||
    user?.username ||
    user?.account_email ||
    ''

  const [faculty, setFaculty] = useState(null)
  const [publications, setPublications] = useState([])
  const [projects, setProjects] = useState([])
  const [supervisions, setSupervisions] = useState([])
  const [loading, setLoading] = useState(false)

  const [profileOpen, setProfileOpen] = useState(false)
  const [modalType, setModalType] = useState(null)
  const [editing, setEditing] = useState(null)

  const [profileForm] = Form.useForm()
  const [itemForm] = Form.useForm()

  const facultyId = faculty?.id

  const loadFaculty = async () => {
    setLoading(true)

    let { data, error } = await supabase
      .from('faculty')
      .select('*')
      .eq('email', currentEmail)
      .maybeSingle()

    if (error) {
      message.error(error.message)
      setLoading(false)
      return
    }

    if (!data) {
      const fullName =
        user?.full_name ||
        user?.name ||
        currentEmail?.split('@')?.[0] ||
        'Giảng viên'

      const insertResult = await supabase
        .from('faculty')
        .insert([
          {
            email: currentEmail,
            full_name: fullName,
            name: fullName,
            degree: '',
            academic_rank: '',
            phone: '',
            department: '',
          },
        ])
        .select('*')
        .single()

      if (insertResult.error) {
        message.error(insertResult.error.message)
        setLoading(false)
        return
      }

      data = insertResult.data
    }

    setFaculty(data)
    await loadDetails(data.id)
    setLoading(false)
  }

  const loadDetails = async (id = facultyId) => {
    if (!id) return

    const [pubRes, projectRes, supRes] = await Promise.all([
      supabase
        .from('faculty_publications')
        .select('*')
        .eq('faculty_id', id)
        .order('year', { ascending: false }),

      supabase
        .from('faculty_projects')
        .select('*')
        .eq('faculty_id', id)
        .order('start_year', { ascending: false }),

      supabase
        .from('faculty_supervisions')
        .select('*')
        .eq('faculty_id', id)
        .order('year', { ascending: false }),
    ])

    if (pubRes.error) message.error(pubRes.error.message)
    if (projectRes.error) message.error(projectRes.error.message)
    if (supRes.error) message.error(supRes.error.message)

    setPublications(pubRes.data || [])
    setProjects(projectRes.data || [])
    setSupervisions(supRes.data || [])
  }

  useEffect(() => {
    if (currentEmail) loadFaculty()
  }, [currentEmail])

  const stats = useMemo(() => {
    return {
      publications: publications.length,
      q12: publications.filter((x) => ['Q1', 'Q2'].includes(x.quartile)).length,
      projects: projects.length,
      supervisions: supervisions.length,
      points: publications.reduce((sum, x) => sum + Number(x.points || 0), 0),
    }
  }, [publications, projects, supervisions])

  const openProfile = () => {
    profileForm.setFieldsValue(faculty || {})
    setProfileOpen(true)
  }

  const saveProfile = async () => {
    const values = await profileForm.validateFields()

    const payload = {
      ...values,
      updated_at: new Date().toISOString(),
    }

    delete payload.id
    delete payload.created_at
    delete payload.email
    delete payload.faculty_code
    delete payload.full_name
    delete payload.name

    const { error } = await supabase
      .from('faculty')
      .update(payload)
      .eq('id', facultyId)

    if (error) return message.error(error.message)

    message.success('Đã cập nhật hồ sơ')
    setProfileOpen(false)
    await loadFaculty()
  }

  const openItem = (type, record = null) => {
    setModalType(type)
    setEditing(record)
    itemForm.resetFields()
    if (record) itemForm.setFieldsValue(record)
  }

  const saveItem = async () => {
    const values = await itemForm.validateFields()

    const tableMap = {
      publication: 'faculty_publications',
      project: 'faculty_projects',
      supervision: 'faculty_supervisions',
    }

    const table = tableMap[modalType]

    const payload = {
      ...values,
      faculty_id: facultyId,
      updated_at: new Date().toISOString(),
    }

    let result

    if (editing?.id) {
      result = await supabase.from(table).update(payload).eq('id', editing.id)
    } else {
      result = await supabase
        .from(table)
        .insert([{ ...payload, created_at: new Date().toISOString() }])
    }

    if (result.error) return message.error(result.error.message)

    message.success('Đã lưu dữ liệu')
    setModalType(null)
    setEditing(null)
    await loadDetails()
  }

  const deleteItem = async (table, id) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) return message.error(error.message)

    message.success('Đã xóa')
    await loadDetails()
  }

  const publicationColumns = [
    { title: 'Tên công bố', dataIndex: 'title', render: (v) => <b>{v}</b> },
    { title: 'Tạp chí/Hội thảo', dataIndex: 'journal' },
    { title: 'Năm', dataIndex: 'year', width: 90 },
    {
      title: 'Q',
      dataIndex: 'quartile',
      width: 90,
      render: (v) => v ? <Tag color={['Q1', 'Q2'].includes(v) ? 'green' : 'blue'}>{v}</Tag> : '',
    },
    { title: 'DOI', dataIndex: 'doi' },
    { title: 'Điểm', dataIndex: 'points', width: 90 },
    {
      title: 'Thao tác',
      width: 180,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openItem('publication', r)}>
            Sửa
          </Button>
          <Popconfirm title="Xóa công bố này?" onConfirm={() => deleteItem('faculty_publications', r.id)}>
            <Button size="small" danger>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const projectColumns = [
    { title: 'Tên đề tài', dataIndex: 'project_name', render: (v) => <b>{v}</b> },
    { title: 'Vai trò', dataIndex: 'role' },
    { title: 'Cấp', dataIndex: 'level' },
    { title: 'Từ năm', dataIndex: 'start_year', width: 100 },
    { title: 'Đến năm', dataIndex: 'end_year', width: 100 },
    { title: 'Trạng thái', dataIndex: 'status' },
    {
      title: 'Thao tác',
      width: 180,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openItem('project', r)}>
            Sửa
          </Button>
          <Popconfirm title="Xóa đề tài này?" onConfirm={() => deleteItem('faculty_projects', r.id)}>
            <Button size="small" danger>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const supervisionColumns = [
    { title: 'Người học', dataIndex: 'student_name', render: (v) => <b>{v}</b> },
    { title: 'Loại', dataIndex: 'student_type' },
    { title: 'Tên đề tài', dataIndex: 'thesis_title' },
    { title: 'Vai trò', dataIndex: 'role' },
    { title: 'Năm', dataIndex: 'year', width: 90 },
    { title: 'Trạng thái', dataIndex: 'status' },
    {
      title: 'Thao tác',
      width: 180,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openItem('supervision', r)}>
            Sửa
          </Button>
          <Popconfirm title="Xóa hướng dẫn này?" onConfirm={() => deleteItem('faculty_supervisions', r.id)}>
            <Button size="small" danger>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  if (!currentEmail) {
    return <Card>Không xác định được email đăng nhập của giảng viên.</Card>
  }

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>Cổng thông tin giảng viên</Title>
          <Text>Xin chào, <b>{pick(faculty, ['full_name', 'name'], user?.full_name || currentEmail)}</b></Text>
        </div>

        <Button onClick={() => window.location.reload()}>
          Tải lại
        </Button>
      </Space>

      <div className="stat-grid">
        <Card className="stat-card">
          <Statistic title="Mã GV" value={pick(faculty, ['faculty_code'], '—')} prefix={<TeamOutlined />} />
        </Card>
        <Card className="stat-card">
          <Statistic title="Công bố" value={stats.publications} prefix={<FileDoneOutlined />} />
        </Card>
        <Card className="stat-card">
          <Statistic title="Q1/Q2" value={stats.q12} prefix={<BookOutlined />} />
        </Card>
        <Card className="stat-card">
          <Statistic title="Hướng dẫn" value={stats.supervisions} prefix={<TeamOutlined />} />
        </Card>
      </div>

      <Tabs
        items={[
          {
            key: 'profile',
            label: 'Thông tin giảng viên',
            children: (
              <Card
                extra={
                  <Button type="primary" icon={<EditOutlined />} onClick={openProfile}>
                    Cập nhật thông tin
                  </Button>
                }
              >
                <Table
                  rowKey={(r) => r[0]}
                  showHeader={false}
                  pagination={false}
                  columns={[
                    { dataIndex: 0, width: 220, render: (v) => <b>{v}</b> },
                    { dataIndex: 1 },
                    { dataIndex: 2, width: 220, render: (v) => <b>{v}</b> },
                    { dataIndex: 3 },
                  ]}
                  dataSource={[
                    ['Mã GV', pick(faculty, ['faculty_code'], ''), 'Họ tên', pick(faculty, ['full_name', 'name'], '')],
                    ['Học hàm', pick(faculty, ['academic_rank'], ''), 'Học vị', pick(faculty, ['degree'], '')],
                    ['Email', pick(faculty, ['email'], ''), 'Điện thoại', pick(faculty, ['phone'], '')],
                    ['Chuyên môn', pick(faculty, ['specialization'], ''), 'Đơn vị', pick(faculty, ['department'], '')],
                    ['ORCID', pick(faculty, ['orcid'], ''), 'Scopus ID', pick(faculty, ['scopus_id'], '')],
                    ['Google Scholar', pick(faculty, ['google_scholar'], ''), 'Hướng nghiên cứu', pick(faculty, ['research_interests'], '')],
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'publications',
            label: 'Công bố khoa học',
            children: (
              <DataTab
                loading={loading}
                data={publications}
                columns={publicationColumns}
                onAdd={() => openItem('publication')}
                buttonText="Thêm công bố"
              />
            ),
          },
          {
            key: 'projects',
            label: 'Đề tài',
            children: (
              <DataTab
                loading={loading}
                data={projects}
                columns={projectColumns}
                onAdd={() => openItem('project')}
                buttonText="Thêm đề tài"
              />
            ),
          },
          {
            key: 'supervisions',
            label: 'Hướng dẫn',
            children: (
              <DataTab
                loading={loading}
                data={supervisions}
                columns={supervisionColumns}
                onAdd={() => openItem('supervision')}
                buttonText="Thêm hướng dẫn"
              />
            ),
          },
        ]}
      />

      <Modal
        title="Cập nhật thông tin giảng viên"
        open={profileOpen}
        onCancel={() => setProfileOpen(false)}
        onOk={saveProfile}
        okText="Lưu"
        cancelText="Hủy"
        width={900}
      >
        <Form form={profileForm} layout="vertical">
          <div className="form-grid">
            <Form.Item label="Học hàm" name="academic_rank">
              <Select options={[
                { value: 'GS', label: 'GS' },
                { value: 'PGS', label: 'PGS' },
                { value: '', label: 'Không' },
              ]} />
            </Form.Item>

            <Form.Item label="Học vị" name="degree">
              <Select options={[
                { value: 'Tiến sĩ', label: 'Tiến sĩ' },
                { value: 'Thạc sĩ', label: 'Thạc sĩ' },
                { value: 'Cử nhân', label: 'Cử nhân' },
              ]} />
            </Form.Item>

            <Form.Item label="Điện thoại" name="phone">
              <Input />
            </Form.Item>

            <Form.Item label="Đơn vị" name="department">
              <Input />
            </Form.Item>

            <Form.Item label="Chuyên môn" name="specialization">
              <Input />
            </Form.Item>

            <Form.Item label="ORCID" name="orcid">
              <Input />
            </Form.Item>

            <Form.Item label="Scopus ID" name="scopus_id">
              <Input />
            </Form.Item>

            <Form.Item label="Google Scholar" name="google_scholar">
              <Input />
            </Form.Item>

            <Form.Item label="Hướng nghiên cứu" name="research_interests" className="full">
              <Input.TextArea rows={3} />
            </Form.Item>

            <Form.Item label="Tiểu sử khoa học" name="biography" className="full">
              <Input.TextArea rows={4} />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <ItemModal
        type={modalType}
        open={!!modalType}
        form={itemForm}
        onCancel={() => {
          setModalType(null)
          setEditing(null)
        }}
        onOk={saveItem}
      />
    </div>
  )
}

function DataTab({ loading, data, columns, onAdd, buttonText }) {
  return (
    <>
      <Card className="toolbar-card" style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
            {buttonText}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
            Tải lại
          </Button>
        </Space>
      </Card>

      <Card className="table-card">
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </>
  )
}

function ItemModal({ type, open, onCancel, onOk, form }) {
  const titleMap = {
    publication: 'Công bố khoa học',
    project: 'Đề tài nghiên cứu',
    supervision: 'Hướng dẫn học viên/NCS',
  }

  return (
    <Modal
      title={titleMap[type] || ''}
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText="Lưu"
      cancelText="Hủy"
      width={850}
    >
      <Form form={form} layout="vertical">
        {type === 'publication' && (
          <div className="form-grid">
            <Form.Item
              name="title"
              label="Tên công bố"
              className="full"
              rules={[{ required: true, message: 'Nhập tên công bố' }]}
            >
              <Input />
            </Form.Item>

            <Form.Item name="journal" label="Tên tạp chí/hội thảo">
              <Input />
            </Form.Item>

            <Form.Item name="year" label="Năm">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="quartile" label="Xếp hạng">
              <Select options={[
                { value: 'Q1', label: 'Q1' },
                { value: 'Q2', label: 'Q2' },
                { value: 'Q3', label: 'Q3' },
                { value: 'Q4', label: 'Q4' },
                { value: 'Scopus', label: 'Scopus' },
                { value: 'WoS', label: 'WoS' },
                { value: 'Khác', label: 'Khác' },
              ]} />
            </Form.Item>

            <Form.Item name="indexed" label="Chỉ mục">
              <Select options={[
                { value: 'Scopus', label: 'Scopus' },
                { value: 'WoS', label: 'WoS' },
                { value: 'Scopus/WoS', label: 'Scopus/WoS' },
                { value: 'Khác', label: 'Khác' },
              ]} />
            </Form.Item>

            <Form.Item name="doi" label="DOI/Link">
              <Input />
            </Form.Item>

            <Form.Item name="authors" label="Tác giả" className="full">
              <Input />
            </Form.Item>

            <Form.Item name="points" label="Điểm NCKH">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="note" label="Ghi chú" className="full">
              <Input.TextArea rows={3} />
            </Form.Item>
          </div>
        )}

        {type === 'project' && (
          <div className="form-grid">
            <Form.Item
              name="project_name"
              label="Tên đề tài"
              className="full"
              rules={[{ required: true, message: 'Nhập tên đề tài' }]}
            >
              <Input />
            </Form.Item>

            <Form.Item name="role" label="Vai trò">
              <Select options={[
                { value: 'Chủ nhiệm', label: 'Chủ nhiệm' },
                { value: 'Thành viên', label: 'Thành viên' },
                { value: 'Thư ký', label: 'Thư ký' },
              ]} />
            </Form.Item>

            <Form.Item name="level" label="Cấp đề tài">
              <Select options={[
                { value: 'Cấp cơ sở', label: 'Cấp cơ sở' },
                { value: 'Cấp Bộ', label: 'Cấp Bộ' },
                { value: 'Cấp Nhà nước', label: 'Cấp Nhà nước' },
                { value: 'Khác', label: 'Khác' },
              ]} />
            </Form.Item>

            <Form.Item name="start_year" label="Năm bắt đầu">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="end_year" label="Năm kết thúc">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="status" label="Trạng thái">
              <Select options={[
                { value: 'Đang thực hiện', label: 'Đang thực hiện' },
                { value: 'Đã nghiệm thu', label: 'Đã nghiệm thu' },
                { value: 'Tạm dừng', label: 'Tạm dừng' },
              ]} />
            </Form.Item>

            <Form.Item name="note" label="Ghi chú" className="full">
              <Input.TextArea rows={3} />
            </Form.Item>
          </div>
        )}

        {type === 'supervision' && (
          <div className="form-grid">
            <Form.Item
              name="student_name"
              label="Tên người học"
              rules={[{ required: true, message: 'Nhập tên người học' }]}
            >
              <Input />
            </Form.Item>

            <Form.Item name="student_type" label="Loại người học">
              <Select options={[
                { value: 'Học viên cao học', label: 'Học viên cao học' },
                { value: 'Nghiên cứu sinh', label: 'Nghiên cứu sinh' },
                { value: 'Sinh viên đại học', label: 'Sinh viên đại học' },
              ]} />
            </Form.Item>

            <Form.Item name="role" label="Vai trò">
              <Select options={[
                { value: 'Hướng dẫn chính', label: 'Hướng dẫn chính' },
                { value: 'Hướng dẫn phụ', label: 'Hướng dẫn phụ' },
              ]} />
            </Form.Item>

            <Form.Item name="year" label="Năm">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="thesis_title" label="Tên đề tài luận văn/luận án" className="full">
              <Input />
            </Form.Item>

            <Form.Item name="status" label="Trạng thái">
              <Select options={[
                { value: 'Đang hướng dẫn', label: 'Đang hướng dẫn' },
                { value: 'Đã bảo vệ', label: 'Đã bảo vệ' },
                { value: 'Tạm dừng', label: 'Tạm dừng' },
              ]} />
            </Form.Item>
          </div>
        )}
      </Form>
    </Modal>
  )
}