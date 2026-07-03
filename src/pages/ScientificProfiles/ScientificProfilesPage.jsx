import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FilePdfOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
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
  Table,
  Tabs,
  Tag,
  message,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const profileTable = 'scientific_profiles'
const outputTable = 'scientific_outputs'

const emptyProfile = {
  faculty_id: null,
  academic_title: '',
  degree: '',
  specialization: '',
  research_fields: '',
  scopus_id: '',
  orcid: '',
  google_scholar: '',
  wos_id: '',
  h_index: 0,
  bio: '',
  status: 'active',
}

const emptyOutput = {
  faculty_id: null,
  output_type: 'Bài báo',
  title: '',
  journal: '',
  publisher: '',
  year: new Date().getFullYear(),
  quartile: '',
  doi: '',
  issn: '',
  authors: '',
  points: 0,
  file_url: '',
  status: 'active',
}

function pick(row, keys, fallback = '') {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  }
  return fallback
}

export default function ScientificProfilesPage() {
  const [profiles, setProfiles] = useState([])
  const [outputs, setOutputs] = useState([])
  const [faculty, setFaculty] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [outputOpen, setOutputOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState(null)
  const [editingOutput, setEditingOutput] = useState(null)
  const [profileForm] = Form.useForm()
  const [outputForm] = Form.useForm()

  const facultyName = (id) => {
    const f = faculty.find((x) => x.id === id)
    return pick(f, ['full_name', 'name', 'ho_ten'], id || '')
  }

  const load = async () => {
    setLoading(true)

    const { data: profileData, error: profileError } = await supabase
      .from(profileTable)
      .select('*')
      .order('created_at', { ascending: false })

    if (profileError) message.error(profileError.message)
    setProfiles(profileData || [])

    const { data: outputData, error: outputError } = await supabase
      .from(outputTable)
      .select('*')
      .order('year', { ascending: false })

    if (outputError) message.error(outputError.message)
    setOutputs(outputData || [])

    const { data: facultyData, error: facultyError } = await supabase
      .from('faculty')
      .select('*')
      .order('full_name', { ascending: true })

    if (facultyError) message.error(facultyError.message)
    setFaculty(facultyData || [])

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filteredProfiles = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return profiles
    return profiles.filter((row) => {
      const name = facultyName(row.faculty_id).toLowerCase()
      return JSON.stringify(row).toLowerCase().includes(q) || name.includes(q)
    })
  }, [profiles, keyword, faculty])

  const filteredOutputs = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return outputs
    return outputs.filter((row) => {
      const name = facultyName(row.faculty_id).toLowerCase()
      return JSON.stringify(row).toLowerCase().includes(q) || name.includes(q)
    })
  }, [outputs, keyword, faculty])

  const stats = useMemo(() => {
    const q1q2 = outputs.filter((x) => ['Q1', 'Q2'].includes(String(x.quartile || '').toUpperCase())).length
    const totalPoints = outputs.reduce((sum, x) => sum + Number(x.points || 0), 0)
    const hIndex = profiles.reduce((max, x) => Math.max(max, Number(x.h_index || 0)), 0)
    return { profiles: profiles.length, outputs: outputs.length, q1q2, totalPoints, hIndex }
  }, [profiles, outputs])

  const openCreateProfile = () => {
    setEditingProfile(null)
    profileForm.setFieldsValue(emptyProfile)
    setProfileOpen(true)
  }

  const openEditProfile = (record) => {
    setEditingProfile(record)
    profileForm.setFieldsValue({
      faculty_id: record.faculty_id || null,
      academic_title: pick(record, ['academic_title'], ''),
      degree: pick(record, ['degree'], ''),
      specialization: pick(record, ['specialization'], ''),
      research_fields: pick(record, ['research_fields', 'research_interests'], ''),
      scopus_id: pick(record, ['scopus_id', 'scopus_author_id'], ''),
      orcid: pick(record, ['orcid'], ''),
      google_scholar: pick(record, ['google_scholar'], ''),
      wos_id: pick(record, ['wos_id', 'wos_researcher_id'], ''),
      h_index: pick(record, ['h_index'], 0),
      bio: pick(record, ['bio'], ''),
      status: pick(record, ['status'], 'active'),
    })
    setProfileOpen(true)
  }

  const saveProfile = async () => {
    const values = await profileForm.validateFields()
    const payload = {
      faculty_id: values.faculty_id || null,
      academic_title: values.academic_title || '',
      degree: values.degree || '',
      specialization: values.specialization || '',
      research_fields: values.research_fields || '',
      scopus_id: values.scopus_id || '',
      orcid: values.orcid || '',
      google_scholar: values.google_scholar || '',
      wos_id: values.wos_id || '',
      h_index: values.h_index || 0,
      bio: values.bio || '',
      status: values.status || 'active',
      updated_at: new Date().toISOString(),
    }

    let error

    if (editingProfile?.id) {
      const result = await supabase.from(profileTable).update(payload).eq('id', editingProfile.id)
      error = result.error
    } else {
      const result = await supabase.from(profileTable).insert([
        {
          ...payload,
          created_at: new Date().toISOString(),
        },
      ])
      error = result.error
    }

    if (error) {
      message.error(error.message)
      return
    }

    message.success(editingProfile ? 'Đã cập nhật LLKH' : 'Đã thêm LLKH')
    setProfileOpen(false)
    load()
  }

  const openCreateOutput = () => {
    setEditingOutput(null)
    outputForm.setFieldsValue(emptyOutput)
    setOutputOpen(true)
  }

  const openEditOutput = (record) => {
    setEditingOutput(record)
    outputForm.setFieldsValue({
      faculty_id: record.faculty_id || null,
      output_type: pick(record, ['output_type', 'publication_type'], 'Bài báo'),
      title: pick(record, ['title'], ''),
      journal: pick(record, ['journal'], ''),
      publisher: pick(record, ['publisher'], ''),
      year: pick(record, ['year', 'publication_year'], new Date().getFullYear()),
      quartile: pick(record, ['quartile'], ''),
      doi: pick(record, ['doi'], ''),
      issn: pick(record, ['issn'], ''),
      authors: pick(record, ['authors'], ''),
      points: pick(record, ['points'], 0),
      file_url: pick(record, ['file_url'], ''),
      status: pick(record, ['status'], 'active'),
    })
    setOutputOpen(true)
  }

  const saveOutput = async () => {
    const values = await outputForm.validateFields()
    const payload = {
      faculty_id: values.faculty_id || null,
      output_type: values.output_type || 'Bài báo',
      title: values.title || '',
      journal: values.journal || '',
      publisher: values.publisher || '',
      year: values.year || new Date().getFullYear(),
      quartile: values.quartile || '',
      doi: values.doi || '',
      issn: values.issn || '',
      authors: values.authors || '',
      points: values.points || 0,
      file_url: values.file_url || '',
      status: values.status || 'active',
      updated_at: new Date().toISOString(),
    }

    let error

    if (editingOutput?.id) {
      const result = await supabase.from(outputTable).update(payload).eq('id', editingOutput.id)
      error = result.error
    } else {
      const result = await supabase.from(outputTable).insert([
        {
          ...payload,
          created_at: new Date().toISOString(),
        },
      ])
      error = result.error
    }

    if (error) {
      message.error(error.message)
      return
    }

    message.success(editingOutput ? 'Đã cập nhật sản phẩm khoa học' : 'Đã thêm sản phẩm khoa học')
    setOutputOpen(false)
    load()
  }

  const remove = async (table, id) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) {
      message.error(error.message)
      return
    }
    message.success('Đã xóa')
    load()
  }

  const exportLlkh = (record) => {
    const data = outputs.filter((x) => x.faculty_id === record.faculty_id)
    exportCsv(`llkh-${facultyName(record.faculty_id) || 'giang-vien'}.csv`, data)
  }

  const profileColumns = [
    { title: 'Giảng viên', dataIndex: 'faculty_id', render: (id) => <b>{facultyName(id)}</b> },
    { title: 'Học hàm', dataIndex: 'academic_title' },
    { title: 'Học vị', dataIndex: 'degree' },
    { title: 'Chuyên môn', dataIndex: 'specialization' },
    { title: 'Scopus ID', dataIndex: 'scopus_id' },
    { title: 'ORCID', dataIndex: 'orcid' },
    { title: 'H-index', dataIndex: 'h_index', align: 'center' },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'active' ? 'green' : 'default'}>{v || 'active'}</Tag> },
    {
      title: 'Thao tác',
      fixed: 'right',
      render: (_, r) => (
        <Space>
          <Button icon={<FilePdfOutlined />} onClick={() => exportLlkh(r)}>Xuất LLKH</Button>
          <Button icon={<EditOutlined />} onClick={() => openEditProfile(r)}>Sửa</Button>
          <Popconfirm title="Xóa LLKH?" onConfirm={() => remove(profileTable, r.id)}>
            <Button danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const outputColumns = [
    { title: 'Giảng viên', dataIndex: 'faculty_id', render: (id) => facultyName(id) },
    { title: 'Loại', dataIndex: 'output_type', render: (v) => <Tag color="blue">{v}</Tag> },
    { title: 'Tên sản phẩm', dataIndex: 'title' },
    { title: 'Tạp chí/NXB', dataIndex: 'journal' },
    { title: 'Năm', dataIndex: 'year', align: 'center' },
    { title: 'Q', dataIndex: 'quartile', render: (v) => (v ? <Tag color={['Q1', 'Q2'].includes(String(v).toUpperCase()) ? 'green' : 'default'}>{v}</Tag> : '') },
    { title: 'Điểm', dataIndex: 'points', align: 'center' },
    { title: 'DOI', dataIndex: 'doi' },
    {
      title: 'Thao tác',
      fixed: 'right',
      render: (_, r) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEditOutput(r)}>Sửa</Button>
          <Popconfirm title="Xóa sản phẩm?" onConfirm={() => remove(outputTable, r.id)}>
            <Button danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <h1 className="page-title">Hồ sơ khoa học giảng viên (LLKH)</h1>
      <div className="page-subtitle">Quản lý hồ sơ khoa học, công bố, đề tài, sách và minh chứng của giảng viên/người hướng dẫn</div>

      <div className="stat-grid">
        <Card className="stat-card"><div className="muted">Hồ sơ LLKH</div><h2>{stats.profiles}</h2></Card>
        <Card className="stat-card"><div className="muted">Sản phẩm khoa học</div><h2>{stats.outputs}</h2></Card>
        <Card className="stat-card"><div className="muted">Q1/Q2</div><h2>{stats.q1q2}</h2></Card>
        <Card className="stat-card"><div className="muted">Tổng điểm</div><h2>{stats.totalPoints}</h2></Card>
        <Card className="stat-card"><div className="muted">H-index cao nhất</div><h2>{stats.hIndex}</h2></Card>
      </div>

      <Card className="toolbar-card" style={{ marginBottom: 16 }}>
        <div className="toolbar">
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm giảng viên, Scopus, ORCID, công bố..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ maxWidth: 420 }}
          />
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
            <Button icon={<DownloadOutlined />} onClick={() => exportCsv('llkh.csv', filteredProfiles)}>Xuất CSV</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateProfile}>Thêm LLKH</Button>
            <Button icon={<PlusOutlined />} onClick={openCreateOutput}>Thêm công bố/sản phẩm</Button>
          </Space>
        </div>
      </Card>

      <Tabs
        items={[
          {
            key: 'profiles',
            label: 'Hồ sơ LLKH',
            children: <Card className="table-card"><Table rowKey="id" loading={loading} columns={profileColumns} dataSource={filteredProfiles} scroll={{ x: 1400 }} pagination={{ pageSize: 8 }} /></Card>,
          },
          {
            key: 'outputs',
            label: 'Công bố / sản phẩm khoa học',
            children: <Card className="table-card"><Table rowKey="id" loading={loading} columns={outputColumns} dataSource={filteredOutputs} scroll={{ x: 1500 }} pagination={{ pageSize: 8 }} /></Card>,
          },
        ]}
      />

      <Modal title={editingProfile ? 'Cập nhật LLKH' : 'Thêm LLKH'} open={profileOpen} onCancel={() => setProfileOpen(false)} onOk={saveProfile} okText="Lưu" cancelText="Hủy" width={860}>
        <Form form={profileForm} layout="vertical">
          <div className="form-grid">
            <Form.Item name="faculty_id" label="Giảng viên" rules={[{ required: true, message: 'Chọn giảng viên' }]} className="full">
              <Select showSearch optionFilterProp="label" options={faculty.map((f) => ({ value: f.id, label: facultyName(f.id) }))} />
            </Form.Item>
            <Form.Item name="academic_title" label="Học hàm"><Input placeholder="PGS, GS..." /></Form.Item>
            <Form.Item name="degree" label="Học vị"><Input placeholder="TS, ThS..." /></Form.Item>
            <Form.Item name="specialization" label="Chuyên môn"><Input /></Form.Item>
            <Form.Item name="scopus_id" label="Scopus ID"><Input /></Form.Item>
            <Form.Item name="orcid" label="ORCID"><Input /></Form.Item>
            <Form.Item name="google_scholar" label="Google Scholar"><Input /></Form.Item>
            <Form.Item name="wos_id" label="WoS Researcher ID"><Input /></Form.Item>
            <Form.Item name="h_index" label="H-index"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'active', label: 'Đang hoạt động' }, { value: 'inactive', label: 'Ngưng' }]} /></Form.Item>
            <Form.Item name="research_fields" label="Lĩnh vực nghiên cứu" className="full"><Input.TextArea rows={2} /></Form.Item>
            <Form.Item name="bio" label="Tóm tắt tiểu sử khoa học" className="full"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title={editingOutput ? 'Cập nhật sản phẩm khoa học' : 'Thêm sản phẩm khoa học'} open={outputOpen} onCancel={() => setOutputOpen(false)} onOk={saveOutput} okText="Lưu" cancelText="Hủy" width={900}>
        <Form form={outputForm} layout="vertical">
          <div className="form-grid">
            <Form.Item name="faculty_id" label="Giảng viên" rules={[{ required: true, message: 'Chọn giảng viên' }]} className="full">
              <Select showSearch optionFilterProp="label" options={faculty.map((f) => ({ value: f.id, label: facultyName(f.id) }))} />
            </Form.Item>
            <Form.Item name="output_type" label="Loại"><Select options={[{ value: 'Bài báo' }, { value: 'Sách' }, { value: 'Chương sách' }, { value: 'Đề tài' }, { value: 'Giải thưởng' }, { value: 'Khác' }]} /></Form.Item>
            <Form.Item name="year" label="Năm"><InputNumber min={1990} max={2100} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="title" label="Tên sản phẩm" className="full" rules={[{ required: true, message: 'Nhập tên sản phẩm' }]}><Input /></Form.Item>
            <Form.Item name="authors" label="Tác giả" className="full"><Input /></Form.Item>
            <Form.Item name="journal" label="Tạp chí/NXB/Đơn vị"><Input /></Form.Item>
            <Form.Item name="publisher" label="Nhà xuất bản"><Input /></Form.Item>
            <Form.Item name="quartile" label="Quartile"><Select allowClear options={[{ value: 'Q1' }, { value: 'Q2' }, { value: 'Q3' }, { value: 'Q4' }, { value: 'WoS' }, { value: 'Scopus' }, { value: 'Khác' }]} /></Form.Item>
            <Form.Item name="points" label="Điểm"><InputNumber min={0} step={0.25} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="doi" label="DOI"><Input /></Form.Item>
            <Form.Item name="issn" label="ISSN"><Input /></Form.Item>
            <Form.Item name="file_url" label="Link minh chứng" className="full"><Input /></Form.Item>
            <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'active', label: 'Đang sử dụng' }, { value: 'inactive', label: 'Ngưng' }]} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </>
  )
}
