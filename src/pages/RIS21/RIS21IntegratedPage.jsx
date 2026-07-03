import { DownloadOutlined, FilePdfOutlined, FileWordOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Dropdown, Input, Select, Space, Tabs, Table, Tag, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'
import { exportLLKHDocx, exportLLKHPdf } from '../../services/llkhExporter'

const TABLES = {
  faculty: 'faculty',
  profiles: 'ris21_profiles',
  education: 'ris21_education_history',
  employment: 'ris21_employment_history',
  languages: 'ris21_languages',
  publications: 'ris21_publications',
  publicationAuthors: 'ris21_publication_authors',
  projects: 'ris21_projects',
  projectMembers: 'ris21_project_members',
}

const pick = (row, keys, fallback = '') => {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  return fallback
}

export default function RIS21IntegratedPage() {
  const [faculty, setFaculty] = useState([])
  const [selectedFacultyId, setSelectedFacultyId] = useState(null)
  const [profile, setProfile] = useState(null)
  const [education, setEducation] = useState([])
  const [employment, setEmployment] = useState([])
  const [languages, setLanguages] = useState([])
  const [publications, setPublications] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')

  const selectedFaculty = faculty.find((x) => x.id === selectedFacultyId)

  const loadFaculty = async () => {
    const { data, error } = await supabase.from(TABLES.faculty).select('*').order('full_name', { ascending: true })
    if (error) return message.error(error.message)
    setFaculty(data || [])
    if (!selectedFacultyId && data?.length) setSelectedFacultyId(data[0].id)
  }

  const loadRIS = async (facultyId) => {
    if (!facultyId) return
    setLoading(true)
    const [profileRes, eduRes, empRes, langRes, authorRes, memberRes] = await Promise.all([
      supabase.from(TABLES.profiles).select('*').eq('faculty_id', facultyId).maybeSingle(),
      supabase.from(TABLES.education).select('*').eq('faculty_id', facultyId).order('from_year', { ascending: true }),
      supabase.from(TABLES.employment).select('*').eq('faculty_id', facultyId).order('from_year', { ascending: true }),
      supabase.from(TABLES.languages).select('*').eq('faculty_id', facultyId),
      supabase.from(TABLES.publicationAuthors).select('*, publication:ris21_publications(*)').eq('faculty_id', facultyId),
      supabase.from(TABLES.projectMembers).select('*, project:ris21_projects(*)').eq('faculty_id', facultyId),
    ])
    if (profileRes.error && profileRes.error.code !== 'PGRST116') message.error(profileRes.error.message)
    if (eduRes.error) message.error(eduRes.error.message)
    if (empRes.error) message.error(empRes.error.message)
    if (langRes.error) message.error(langRes.error.message)
    if (authorRes.error) message.error(authorRes.error.message)
    if (memberRes.error) message.error(memberRes.error.message)

    setProfile(profileRes.data || null)
    setEducation(eduRes.data || [])
    setEmployment(empRes.data || [])
    setLanguages(langRes.data || [])
    setPublications((authorRes.data || []).map((a) => ({ ...a.publication, author_role: a.role, author_order: a.author_order, is_corresponding: a.is_corresponding })))
    setProjects((memberRes.data || []).map((m) => ({ ...m.project, member_role: m.role })))
    setLoading(false)
  }

  useEffect(() => { loadFaculty() }, [])
  useEffect(() => { loadRIS(selectedFacultyId) }, [selectedFacultyId])

  const llkhData = useMemo(() => ({ faculty: selectedFaculty, profile, education, employment, languages, publications, projects }), [selectedFaculty, profile, education, employment, languages, publications, projects])

  const stats = useMemo(() => ({
    publications: publications.length,
    q1q2: publications.filter((x) => ['Q1', 'Q2'].includes(String(x.quartile).toUpperCase())).length,
    projects: projects.length,
    points: publications.reduce((s, x) => s + Number(x.points || 0), 0),
  }), [publications, projects])

  const publicationRows = useMemo(() => publications.filter((x) => JSON.stringify(x).toLowerCase().includes(keyword.toLowerCase())), [publications, keyword])

  const exportMenu = {
    items: [
      { key: 'word', icon: <FileWordOutlined />, label: 'Xuất LLKH Word (.docx)', onClick: () => exportLLKHDocx(llkhData) },
      { key: 'pdf', icon: <FilePdfOutlined />, label: 'Xuất LLKH PDF', onClick: () => exportLLKHPdf(llkhData) },
    ],
  }

  return <>
    <h1 className="page-title">RIS 2.1 – Hồ sơ khoa học tích hợp</h1>
    <div className="page-subtitle">Dữ liệu nhân sự lấy từ Module Giảng viên; dữ liệu khoa học bổ sung trong RIS; xuất LLKH trực tiếp từ cùng một nguồn dữ liệu.</div>

    <Card className="toolbar-card" style={{ marginBottom: 16 }}>
      <div className="toolbar">
        <Select
          showSearch
          optionFilterProp="label"
          value={selectedFacultyId}
          onChange={setSelectedFacultyId}
          style={{ minWidth: 300 }}
          options={faculty.map((f) => ({ value: f.id, label: pick(f, ['full_name', 'name'], f.id) }))}
        />
        <Space>
          <Input prefix={<SearchOutlined />} placeholder="Tìm kiếm..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <Button icon={<ReloadOutlined />} onClick={() => loadRIS(selectedFacultyId)}>Tải lại</Button>
          <Dropdown menu={exportMenu} trigger={['click']}>
            <Button type="primary" icon={<DownloadOutlined />}>Xuất LLKH</Button>
          </Dropdown>
        </Space>
      </div>
    </Card>

    <div className="stat-grid">
      <Card className="stat-card"><div className="muted">Công bố</div><h2>{stats.publications}</h2></Card>
      <Card className="stat-card"><div className="muted">Q1/Q2</div><h2>{stats.q1q2}</h2></Card>
      <Card className="stat-card"><div className="muted">Đề tài</div><h2>{stats.projects}</h2></Card>
      <Card className="stat-card"><div className="muted">Điểm NCKH</div><h2>{stats.points}</h2></Card>
    </div>

    <Tabs items={[
      { key: 'personal', label: 'Thông tin nhân sự', children: <Card><Table pagination={false} rowKey="label" dataSource={[
        { label: 'Họ tên', value: pick(selectedFaculty, ['full_name', 'name']) },
        { label: 'Học hàm', value: pick(selectedFaculty, ['academic_rank'], profile?.academic_rank) },
        { label: 'Học vị', value: pick(selectedFaculty, ['degree'], profile?.degree) },
        { label: 'Email', value: selectedFaculty?.email },
        { label: 'Điện thoại', value: selectedFaculty?.phone },
        { label: 'Đơn vị', value: selectedFaculty?.department },
        { label: 'Chuyên môn', value: pick(selectedFaculty, ['specialization'], profile?.specialization) },
      ]} columns={[{ title: 'Thông tin', dataIndex: 'label' }, { title: 'Nội dung', dataIndex: 'value' }]} /></Card> },
      { key: 'edu', label: 'Quá trình đào tạo', children: <Card><Table loading={loading} rowKey="id" dataSource={education} columns={[{ title: 'Bậc', dataIndex: 'level' }, { title: 'Trường', dataIndex: 'institution' }, { title: 'Quốc gia', dataIndex: 'country' }, { title: 'Ngành', dataIndex: 'major' }, { title: 'Năm', render: (_, r) => r.diploma_year || r.to_year }]} /></Card> },
      { key: 'emp', label: 'Quá trình công tác', children: <Card><Table loading={loading} rowKey="id" dataSource={employment} columns={[{ title: 'Từ', dataIndex: 'from_year' }, { title: 'Đến', dataIndex: 'to_year' }, { title: 'Đơn vị', dataIndex: 'organization' }, { title: 'Chức vụ', dataIndex: 'position' }]} /></Card> },
      { key: 'lang', label: 'Ngoại ngữ', children: <Card><Table loading={loading} rowKey="id" dataSource={languages} columns={[{ title: 'Ngoại ngữ', dataIndex: 'language' }, { title: 'Nghe', dataIndex: 'listening' }, { title: 'Nói', dataIndex: 'speaking' }, { title: 'Đọc', dataIndex: 'reading' }, { title: 'Viết', dataIndex: 'writing' }, { title: 'Chứng chỉ', dataIndex: 'certificate' }]} /></Card> },
      { key: 'pub', label: 'Công bố khoa học', children: <Card><Space style={{ marginBottom: 12 }}><Button onClick={() => exportCsv('cong-bo.csv', publicationRows)}>Xuất CSV</Button></Space><Table loading={loading} rowKey="id" dataSource={publicationRows} columns={[{ title: 'Năm', dataIndex: 'year' }, { title: 'Tên công bố', dataIndex: 'title' }, { title: 'Tạp chí', dataIndex: 'journal' }, { title: 'Q', dataIndex: 'quartile', render: v => v ? <Tag color={['Q1','Q2'].includes(String(v).toUpperCase()) ? 'green' : 'default'}>{v}</Tag> : '' }, { title: 'DOI', dataIndex: 'doi' }, { title: 'Điểm', dataIndex: 'points' }, { title: 'Vai trò', dataIndex: 'author_role' }]} /></Card> },
      { key: 'project', label: 'Đề tài', children: <Card><Table loading={loading} rowKey="id" dataSource={projects} columns={[{ title: 'Mã', dataIndex: 'project_code' }, { title: 'Tên đề tài', dataIndex: 'title' }, { title: 'Cấp', dataIndex: 'project_level' }, { title: 'Năm', render: (_, r) => [r.start_year, r.end_year].filter(Boolean).join('-') }, { title: 'Vai trò', dataIndex: 'member_role' }]} /></Card> },
    ]} />
  </>
}
