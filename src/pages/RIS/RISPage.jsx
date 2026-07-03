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

const tables = {
  profiles: 'ris_profiles',
  education: 'ris_education_history',
  employment: 'ris_employment_history',
  publications: 'ris_publications',
  projects: 'ris_projects',
  attachments: 'ris_attachments',
  metrics: 'ris_metrics',
}

function pick(row, keys, fallback = '') {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  return fallback
}

export default function RISPage() {
  const [profiles, setProfiles] = useState([])
  const [faculty, setFaculty] = useState([])
  const [education, setEducation] = useState([])
  const [employment, setEmployment] = useState([])
  const [publications, setPublications] = useState([])
  const [projects, setProjects] = useState([])
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [itemOpen, setItemOpen] = useState(false)
  const [itemType, setItemType] = useState('publication')
  const [editingProfile, setEditingProfile] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [profileForm] = Form.useForm()
  const [itemForm] = Form.useForm()

  const load = async () => {
    setLoading(true)

    const { data: profileData, error: profileError } = await supabase
      .from(tables.profiles)
      .select('*')
      .order('created_at', { ascending: false })
    if (profileError) message.error(profileError.message)
    setProfiles(profileData || [])

    const { data: facultyData } = await supabase
      .from('faculty')
      .select('*')
      .order('full_name', { ascending: true })
    setFaculty(facultyData || [])

    const [{ data: edu }, { data: emp }, { data: pubs }, { data: projs }, { data: files }] = await Promise.all([
      supabase.from(tables.education).select('*'),
      supabase.from(tables.employment).select('*'),
      supabase.from(tables.publications).select('*').order('publication_year', { ascending: false }),
      supabase.from(tables.projects).select('*').order('start_year', { ascending: false }),
      supabase.from(tables.attachments).select('*').order('created_at', { ascending: false }),
    ])

    setEducation(edu || [])
    setEmployment(emp || [])
    setPublications(pubs || [])
    setProjects(projs || [])
    setAttachments(files || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const facultyName = (id) => {
    const f = faculty.find((x) => x.id === id)
    return pick(f, ['full_name', 'name', 'ho_ten'], id || '')
  }

  const filteredProfiles = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return profiles
    return profiles.filter((r) => JSON.stringify(r).toLowerCase().includes(q) || facultyName(r.faculty_id).toLowerCase().includes(q))
  }, [profiles, keyword, faculty])

  const stats = useMemo(() => {
    const totalPubs = publications.length
    const q1q2 = publications.filter((x) => ['Q1', 'Q2'].includes(String(x.quartile || '').toUpperCase())).length
    const totalPoints = publications.reduce((sum, x) => sum + Number(x.points || 0), 0)
    const totalProjects = projects.length
    return { profiles: profiles.length, totalPubs, q1q2, totalPoints, totalProjects }
  }, [profiles, publications, projects])

  const openCreateProfile = () => {
    setEditingProfile(null)
    profileForm.setFieldsValue({
      faculty_id: null,
      academic_title: '',
      degree: '',
      specialization: '',
      research_interests: '',
      orcid: '',
      scopus_author_id: '',
      google_scholar: '',
      wos_researcher_id: '',
      h_index: 0,
      i10_index: 0,
      citations: 0,
      status: 'active',
      biography: '',
    })
    setProfileOpen(true)
  }

  const openEditProfile = (record) => {
    setEditingProfile(record)
    profileForm.setFieldsValue(record)
    setProfileOpen(true)
  }

  const saveProfile = async () => {
    const values = await profileForm.validateFields()
    const payload = { ...values, updated_at: new Date().toISOString() }

    let error
    if (editingProfile?.id) {
      const result = await supabase.from(tables.profiles).update(payload).eq('id', editingProfile.id)
      error = result.error
    } else {
      const result = await supabase.from(tables.profiles).insert([{ ...payload, created_at: new Date().toISOString() }])
      error = result.error
    }

    if (error) return message.error(error.message)
    message.success(editingProfile ? 'Đã cập nhật hồ sơ RIS' : 'Đã thêm hồ sơ RIS')
    setProfileOpen(false)
    load()
  }

  const remove = async (table, id) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa')
    load()
  }

  const openItem = (type, profile = selectedProfile, record = null) => {
    setItemType(type)
    setEditingItem(record)
    setSelectedProfile(profile)
    if (record) itemForm.setFieldsValue(record)
    else {
      if (type === 'publication') itemForm.setFieldsValue({ profile_id: profile?.id, title: '', publication_type: 'Journal Article', journal: '', quartile: '', publication_year: new Date().getFullYear(), doi: '', points: 0, authors: '', role: '' })
      if (type === 'education') itemForm.setFieldsValue({ profile_id: profile?.id, degree_level: '', institution: '', country: '', major: '', graduation_year: null })
      if (type === 'employment') itemForm.setFieldsValue({ profile_id: profile?.id, from_year: null, to_year: null, organization: '', position: '' })
      if (type === 'project') itemForm.setFieldsValue({ profile_id: profile?.id, project_name: '', project_level: '', role: '', start_year: new Date().getFullYear(), end_year: null, budget: 0 })
      if (type === 'attachment') itemForm.setFieldsValue({ profile_id: profile?.id, file_name: '', file_url: '', file_type: '', note: '' })
    }
    setItemOpen(true)
  }

  const saveItem = async () => {
    const values = await itemForm.validateFields()
    const table = {
      publication: tables.publications,
      education: tables.education,
      employment: tables.employment,
      project: tables.projects,
      attachment: tables.attachments,
    }[itemType]

    const payload = { ...values, profile_id: selectedProfile?.id || values.profile_id, updated_at: new Date().toISOString() }
    let error
    if (editingItem?.id) {
      const result = await supabase.from(table).update(payload).eq('id', editingItem.id)
      error = result.error
    } else {
      const result = await supabase.from(table).insert([{ ...payload, created_at: new Date().toISOString() }])
      error = result.error
    }

    if (error) return message.error(error.message)
    message.success('Đã lưu dữ liệu')
    setItemOpen(false)
    load()
  }

  const profileColumns = [
    { title: 'Giảng viên', dataIndex: 'faculty_id', render: (id) => <b>{facultyName(id)}</b> },
    { title: 'Học hàm', dataIndex: 'academic_title' },
    { title: 'Học vị', dataIndex: 'degree' },
    { title: 'Chuyên môn', dataIndex: 'specialization' },
    { title: 'H-index', dataIndex: 'h_index', align: 'center' },
    { title: 'Citations', dataIndex: 'citations', align: 'center' },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'active' ? 'green' : 'default'}>{v || 'active'}</Tag> },
    {
      title: 'Thao tác', fixed: 'right', render: (_, r) => <Space>
        <Button onClick={() => setSelectedProfile(r)}>Chi tiết</Button>
        <Button icon={<FilePdfOutlined />}>Xuất LLKH</Button>
        <Button icon={<EditOutlined />} onClick={() => openEditProfile(r)}>Sửa</Button>
        <Popconfirm title="Xóa hồ sơ này?" onConfirm={() => remove(tables.profiles, r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm>
      </Space>,
    },
  ]

  const profileId = selectedProfile?.id
  const profilePublications = publications.filter((x) => x.profile_id === profileId)
  const profileEducation = education.filter((x) => x.profile_id === profileId)
  const profileEmployment = employment.filter((x) => x.profile_id === profileId)
  const profileProjects = projects.filter((x) => x.profile_id === profileId)
  const profileAttachments = attachments.filter((x) => x.profile_id === profileId)

  const publicationColumns = [
    { title: 'Loại', dataIndex: 'publication_type' },
    { title: 'Tên công trình', dataIndex: 'title' },
    { title: 'Tạp chí/NXB', dataIndex: 'journal' },
    { title: 'Năm', dataIndex: 'publication_year' },
    { title: 'Q', dataIndex: 'quartile', render: (v) => v ? <Tag color={['Q1', 'Q2'].includes(String(v).toUpperCase()) ? 'green' : 'blue'}>{v}</Tag> : '' },
    { title: 'Điểm', dataIndex: 'points' },
    { title: 'DOI', dataIndex: 'doi' },
    { title: 'Thao tác', render: (_, r) => <Space><Button size="small" onClick={() => openItem('publication', selectedProfile, r)}>Sửa</Button><Popconfirm title="Xóa?" onConfirm={() => remove(tables.publications, r.id)}><Button size="small" danger>Xóa</Button></Popconfirm></Space> },
  ]

  return <>
    <h1 className="page-title">Research Information System (RIS)</h1>
    <div className="page-subtitle">Quản lý hồ sơ khoa học, LLKH, công bố, đề tài, minh chứng và KPI nghiên cứu của giảng viên</div>

    <div className="stat-grid">
      <Card className="stat-card"><div className="muted">Hồ sơ RIS</div><h2>{stats.profiles}</h2></Card>
      <Card className="stat-card"><div className="muted">Công bố</div><h2>{stats.totalPubs}</h2></Card>
      <Card className="stat-card"><div className="muted">Q1/Q2</div><h2>{stats.q1q2}</h2></Card>
      <Card className="stat-card"><div className="muted">Tổng điểm NCKH</div><h2>{stats.totalPoints}</h2></Card>
      <Card className="stat-card"><div className="muted">Đề tài</div><h2>{stats.totalProjects}</h2></Card>
    </div>

    <Card className="toolbar-card" style={{ marginBottom: 16 }}>
      <div className="toolbar">
        <Input prefix={<SearchOutlined />} placeholder="Tìm giảng viên, ORCID, Scopus, lĩnh vực..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ maxWidth: 420 }} />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv('ris-profiles.csv', filteredProfiles)}>Xuất CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateProfile}>Thêm hồ sơ RIS</Button>
        </Space>
      </div>
    </Card>

    <Card className="table-card" style={{ marginBottom: 16 }}>
      <Table rowKey="id" loading={loading} columns={profileColumns} dataSource={filteredProfiles} scroll={{ x: 1500 }} pagination={{ pageSize: 8 }} />
    </Card>

    {selectedProfile && <Card title={`Chi tiết RIS: ${facultyName(selectedProfile.faculty_id)}`} className="table-card">
      <Tabs items={[
        { key: 'publications', label: 'Công bố khoa học', children: <><Space style={{ marginBottom: 12 }}><Button type="primary" icon={<PlusOutlined />} onClick={() => openItem('publication')}>Thêm công bố</Button></Space><Table rowKey="id" columns={publicationColumns} dataSource={profilePublications} scroll={{ x: 1300 }} pagination={{ pageSize: 5 }} /></> },
        { key: 'education', label: 'Quá trình đào tạo', children: <GenericTable data={profileEducation} table={tables.education} openItem={(r) => openItem('education', selectedProfile, r)} remove={remove} add={() => openItem('education')} /> },
        { key: 'employment', label: 'Quá trình công tác', children: <GenericTable data={profileEmployment} table={tables.employment} openItem={(r) => openItem('employment', selectedProfile, r)} remove={remove} add={() => openItem('employment')} /> },
        { key: 'projects', label: 'Đề tài', children: <GenericTable data={profileProjects} table={tables.projects} openItem={(r) => openItem('project', selectedProfile, r)} remove={remove} add={() => openItem('project')} /> },
        { key: 'attachments', label: 'Minh chứng', children: <GenericTable data={profileAttachments} table={tables.attachments} openItem={(r) => openItem('attachment', selectedProfile, r)} remove={remove} add={() => openItem('attachment')} /> },
      ]} />
    </Card>}

    <Modal title={editingProfile ? 'Cập nhật hồ sơ RIS' : 'Thêm hồ sơ RIS'} open={profileOpen} onCancel={() => setProfileOpen(false)} onOk={saveProfile} okText="Lưu" cancelText="Hủy" width={900}>
      <Form form={profileForm} layout="vertical"><div className="form-grid">
        <Form.Item name="faculty_id" label="Giảng viên" rules={[{ required: true, message: 'Chọn giảng viên' }]} className="full"><Select showSearch optionFilterProp="label" options={faculty.map((f) => ({ value: f.id, label: facultyName(f.id) }))} /></Form.Item>
        <Form.Item name="academic_title" label="Học hàm"><Input placeholder="PGS, GS..." /></Form.Item>
        <Form.Item name="degree" label="Học vị"><Input placeholder="TS, ThS..." /></Form.Item>
        <Form.Item name="specialization" label="Chuyên môn"><Input /></Form.Item>
        <Form.Item name="orcid" label="ORCID"><Input /></Form.Item>
        <Form.Item name="scopus_author_id" label="Scopus Author ID"><Input /></Form.Item>
        <Form.Item name="google_scholar" label="Google Scholar"><Input /></Form.Item>
        <Form.Item name="wos_researcher_id" label="WoS Researcher ID"><Input /></Form.Item>
        <Form.Item name="h_index" label="H-index"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="i10_index" label="i10-index"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="citations" label="Citations"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'active', label: 'Đang hoạt động' }, { value: 'inactive', label: 'Ngưng' }]} /></Form.Item>
        <Form.Item name="research_interests" label="Hướng nghiên cứu" className="full"><Input.TextArea rows={3} /></Form.Item>
        <Form.Item name="biography" label="Tóm tắt lý lịch khoa học" className="full"><Input.TextArea rows={4} /></Form.Item>
      </div></Form>
    </Modal>

    <Modal title="Cập nhật dữ liệu RIS" open={itemOpen} onCancel={() => setItemOpen(false)} onOk={saveItem} okText="Lưu" cancelText="Hủy" width={860}>
      <RISItemForm type={itemType} form={itemForm} />
    </Modal>
  </>
}

function GenericTable({ data, table, openItem, remove, add }) {
  const cols = data[0] ? Object.keys(data[0]).filter((k) => !['id', 'profile_id'].includes(k)).slice(0, 6).map((k) => ({ title: k, dataIndex: k })) : []
  return <>
    <Space style={{ marginBottom: 12 }}><Button type="primary" icon={<PlusOutlined />} onClick={add}>Thêm</Button></Space>
    <Table rowKey="id" dataSource={data} columns={[...cols, { title: 'Thao tác', render: (_, r) => <Space><Button size="small" onClick={() => openItem(r)}>Sửa</Button><Popconfirm title="Xóa?" onConfirm={() => remove(table, r.id)}><Button size="small" danger>Xóa</Button></Popconfirm></Space> }]} scroll={{ x: 1100 }} pagination={{ pageSize: 5 }} />
  </>
}

function RISItemForm({ type, form }) {
  if (type === 'publication') return <Form form={form} layout="vertical"><div className="form-grid">
    <Form.Item name="publication_type" label="Loại"><Select options={[{ value: 'Journal Article' }, { value: 'Book' }, { value: 'Book Chapter' }, { value: 'Conference' }, { value: 'Domestic Journal' }, { value: 'Other' }]} /></Form.Item>
    <Form.Item name="publication_year" label="Năm"><InputNumber min={1990} max={2100} style={{ width: '100%' }} /></Form.Item>
    <Form.Item name="title" label="Tên công trình" className="full" rules={[{ required: true, message: 'Nhập tên công trình' }]}><Input /></Form.Item>
    <Form.Item name="journal" label="Tạp chí/NXB" className="full"><Input /></Form.Item>
    <Form.Item name="quartile" label="Quartile"><Select allowClear options={[{ value: 'Q1' }, { value: 'Q2' }, { value: 'Q3' }, { value: 'Q4' }, { value: 'WoS' }, { value: 'Scopus' }, { value: 'Khác' }]} /></Form.Item>
    <Form.Item name="points" label="Điểm"><InputNumber min={0} step={0.25} style={{ width: '100%' }} /></Form.Item>
    <Form.Item name="doi" label="DOI"><Input /></Form.Item>
    <Form.Item name="role" label="Vai trò"><Select allowClear options={[{ value: 'Tác giả chính' }, { value: 'Tác giả liên hệ' }, { value: 'Đồng tác giả' }]} /></Form.Item>
    <Form.Item name="authors" label="Tác giả" className="full"><Input.TextArea rows={2} /></Form.Item>
  </div></Form>

  if (type === 'education') return <Form form={form} layout="vertical"><div className="form-grid">
    <Form.Item name="degree_level" label="Bậc đào tạo"><Input /></Form.Item>
    <Form.Item name="institution" label="Cơ sở đào tạo"><Input /></Form.Item>
    <Form.Item name="country" label="Quốc gia"><Input /></Form.Item>
    <Form.Item name="major" label="Ngành"><Input /></Form.Item>
    <Form.Item name="graduation_year" label="Năm tốt nghiệp"><InputNumber min={1950} max={2100} style={{ width: '100%' }} /></Form.Item>
  </div></Form>

  if (type === 'employment') return <Form form={form} layout="vertical"><div className="form-grid">
    <Form.Item name="from_year" label="Từ năm"><InputNumber min={1950} max={2100} style={{ width: '100%' }} /></Form.Item>
    <Form.Item name="to_year" label="Đến năm"><InputNumber min={1950} max={2100} style={{ width: '100%' }} /></Form.Item>
    <Form.Item name="organization" label="Đơn vị" className="full"><Input /></Form.Item>
    <Form.Item name="position" label="Chức vụ" className="full"><Input /></Form.Item>
  </div></Form>

  if (type === 'project') return <Form form={form} layout="vertical"><div className="form-grid">
    <Form.Item name="project_name" label="Tên đề tài" className="full"><Input /></Form.Item>
    <Form.Item name="project_level" label="Cấp đề tài"><Input /></Form.Item>
    <Form.Item name="role" label="Vai trò"><Input /></Form.Item>
    <Form.Item name="start_year" label="Năm bắt đầu"><InputNumber min={1950} max={2100} style={{ width: '100%' }} /></Form.Item>
    <Form.Item name="end_year" label="Năm kết thúc"><InputNumber min={1950} max={2100} style={{ width: '100%' }} /></Form.Item>
    <Form.Item name="budget" label="Kinh phí"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
  </div></Form>

  return <Form form={form} layout="vertical"><div className="form-grid">
    <Form.Item name="file_name" label="Tên minh chứng" className="full"><Input /></Form.Item>
    <Form.Item name="file_url" label="Link file" className="full"><Input /></Form.Item>
    <Form.Item name="file_type" label="Loại file"><Input /></Form.Item>
    <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={3} /></Form.Item>
  </div></Form>
}
