import { BookOutlined, EditOutlined, FileTextOutlined, SaveOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Card, Col, Descriptions, Empty, Form, Input, InputNumber, Modal, Row, Select, Space, Tabs, Table, Tag, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../context/AuthContext.jsx'
import GenericTableTab from './components/GenericTableTab.jsx'
import { deleteRow, loadFacultyPortalData, saveRow, updateFaculty, upsertRisProfile } from './services/facultyPortalService.js'

const qOptions = ['Q1', 'Q2', 'Q3', 'Q4', 'Scopus', 'WoS', 'Khác'].map(value => ({ value, label: value }))
const indexOptions = ['Scopus', 'WoS', 'Scopus/WoS', 'ACI', 'HĐGS', 'Khác'].map(value => ({ value, label: value }))

export default function FacultyPortalPage() {
  const { profile, facultyId, signOut } = useAuth()
  const [state, setState] = useState({ faculty: null, risProfile: null, publications: [], projects: [], supervisions: [], teaching: [] })
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const { faculty, risProfile, publications, projects, supervisions, teaching } = state

  const load = async () => {
    if (!facultyId) return
    setLoading(true)
    try { setState(await loadFacultyPortalData(facultyId)) }
    catch (e) { message.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [facultyId])

  const stats = useMemo(() => ({
    pubs: publications.length,
    q1q2: publications.filter(x => ['Q1', 'Q2'].includes(String(x.quartile || '').toUpperCase())).length,
    projects: projects.length,
    supervisions: supervisions.length,
    points: publications.reduce((s, x) => s + Number(x.points || 0), 0),
  }), [publications, projects, supervisions])

  const openModal = (type, record = null) => {
    setModal(type); setEditing(record); form.resetFields()
    if (type === 'profile') form.setFieldsValue(faculty || {})
    if (type === 'ris') form.setFieldsValue({ ...risProfile, orcid: risProfile?.orcid || faculty?.orcid, scopus_id: risProfile?.scopus_id || faculty?.scopus_id, google_scholar: risProfile?.google_scholar || faculty?.google_scholar, research_interests: risProfile?.research_interests || faculty?.research_interests, research_summary: risProfile?.research_summary || faculty?.biography })
    if (type === 'publication') form.setFieldsValue({ year: new Date().getFullYear(), authors: faculty?.full_name, points: 0, ...(record || {}) })
    if (type === 'project') form.setFieldsValue(record || {})
    if (type === 'supervision') form.setFieldsValue(record || {})
  }

  const closeModal = () => { setModal(null); setEditing(null); form.resetFields() }

  const save = async () => {
    const values = await form.validateFields()
    let result
    if (modal === 'profile') result = await updateFaculty(facultyId, values)
    if (modal === 'ris') {
      result = await upsertRisProfile(facultyId, values)
      await updateFaculty(facultyId, { orcid: values.orcid, scopus_id: values.scopus_id, google_scholar: values.google_scholar, research_interests: values.research_interests, biography: values.research_summary })
    }
    if (modal === 'publication') result = await saveRow('faculty_publications', facultyId, values, editing?.id)
    if (modal === 'project') result = await saveRow('faculty_projects', facultyId, values, editing?.id)
    if (modal === 'supervision') result = await saveRow('faculty_supervisions', facultyId, values, editing?.id)
    if (result?.error) return message.error(result.error.message)
    message.success('Đã lưu dữ liệu')
    closeModal(); load()
  }

  const remove = async (table, record) => {
    const { error } = await deleteRow(table, record.id)
    if (error) return message.error(error.message)
    message.success('Đã xóa'); load()
  }

  if (!facultyId) return <div style={{ padding: 32 }}><Empty description="Tài khoản chưa được liên kết với giảng viên. Vui lòng liên hệ quản trị viên." /></div>

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <div><h1>Cổng thông tin giảng viên</h1><div>Xin chào, <b>{profile?.full_name || faculty?.full_name}</b></div></div>
        <Button onClick={signOut}>Đăng xuất</Button>
      </Space>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={6}><Card><Space><UserOutlined /><div><div>Mã GV</div><h2>{faculty?.faculty_code || '-'}</h2></div></Space></Card></Col>
        <Col xs={24} md={6}><Card><Space><FileTextOutlined /><div><div>Công bố</div><h2>{stats.pubs}</h2></div></Space></Card></Col>
        <Col xs={24} md={6}><Card><Space><BookOutlined /><div><div>Q1/Q2</div><h2>{stats.q1q2}</h2></div></Space></Card></Col>
        <Col xs={24} md={6}><Card><Space><TeamOutlined /><div><div>Hướng dẫn</div><h2>{stats.supervisions}</h2></div></Space></Card></Col>
      </Row>

      <Tabs items={[
        { key: 'profile', label: 'Thông tin giảng viên', children: <ProfileCard loading={loading} faculty={faculty} onEdit={() => openModal('profile')} /> },
        { key: 'ris', label: 'LLKH / RIS', children: <RisCard loading={loading} faculty={faculty} risProfile={risProfile} onEdit={() => openModal('ris')} /> },
        { key: 'publications', label: 'Công bố khoa học', children: <GenericTableTab loading={loading} data={publications} addText="Thêm công bố" onAdd={() => openModal('publication')} onEdit={(r) => openModal('publication', r)} onDelete={(r) => remove('faculty_publications', r)} columns={publicationColumns} /> },
        { key: 'projects', label: 'Đề tài', children: <GenericTableTab loading={loading} data={projects} addText="Thêm đề tài" onAdd={() => openModal('project')} onEdit={(r) => openModal('project', r)} onDelete={(r) => remove('faculty_projects', r)} columns={projectColumns} /> },
        { key: 'supervisions', label: 'Hướng dẫn', children: <GenericTableTab loading={loading} data={supervisions} addText="Thêm hướng dẫn" onAdd={() => openModal('supervision')} onEdit={(r) => openModal('supervision', r)} onDelete={(r) => remove('faculty_supervisions', r)} columns={supervisionColumns} /> },
        { key: 'teaching', label: 'Giảng dạy / CTĐT', children: <TeachingTable loading={loading} data={teaching} /> },
      ]} />

      <Modal title={modalTitle[modal] || ''} open={!!modal} onOk={save} onCancel={closeModal} okText="Lưu" cancelText="Hủy" width={900}>
        <Form form={form} layout="vertical"><Row gutter={16}>{modal === 'profile' && <ProfileForm />}{modal === 'ris' && <RisForm />}{modal === 'publication' && <PublicationForm />}{modal === 'project' && <ProjectForm />}{modal === 'supervision' && <SupervisionForm />}</Row></Form>
      </Modal>
    </div>
  )
}

const modalTitle = { profile: 'Cập nhật thông tin giảng viên', ris: 'Cập nhật LLKH/RIS', publication: 'Công bố khoa học', project: 'Đề tài nghiên cứu', supervision: 'Hướng dẫn học viên/NCS' }

function ProfileCard({ loading, faculty, onEdit }) { return <Card loading={loading} extra={<Button type="primary" icon={<EditOutlined />} onClick={onEdit}>Cập nhật thông tin</Button>}><Descriptions bordered column={2}>{['faculty_code','full_name','academic_rank','degree','email','phone','specialization','department','orcid','scopus_id','google_scholar','research_interests'].map(k => <Descriptions.Item key={k} label={labelMap[k]}>{faculty?.[k] || '-'}</Descriptions.Item>)}<Descriptions.Item label="Tiểu sử khoa học" span={2}>{faculty?.biography || '-'}</Descriptions.Item></Descriptions></Card> }
function RisCard({ loading, faculty, risProfile, onEdit }) { return <Card loading={loading} extra={<Button type="primary" icon={<SaveOutlined />} onClick={onEdit}>Cập nhật LLKH/RIS</Button>}><Descriptions bordered column={2}>{['birth_date','birthplace','hometown','h_index','wos_researcher_id','research_area'].map(k => <Descriptions.Item key={k} label={labelMap[k]}>{risProfile?.[k] || '-'}</Descriptions.Item>)}<Descriptions.Item label="ORCID">{risProfile?.orcid || faculty?.orcid || '-'}</Descriptions.Item><Descriptions.Item label="Scopus ID">{risProfile?.scopus_id || faculty?.scopus_id || '-'}</Descriptions.Item><Descriptions.Item label="Google Scholar">{risProfile?.google_scholar || faculty?.google_scholar || '-'}</Descriptions.Item><Descriptions.Item label="Hướng nghiên cứu" span={2}>{risProfile?.research_interests || faculty?.research_interests || '-'}</Descriptions.Item><Descriptions.Item label="Tiểu sử khoa học" span={2}>{risProfile?.research_summary || faculty?.biography || '-'}</Descriptions.Item></Descriptions></Card> }

const labelMap = { faculty_code:'Mã GV', full_name:'Họ tên', academic_rank:'Học hàm', degree:'Học vị', email:'Email', phone:'Điện thoại', specialization:'Chuyên môn', department:'Đơn vị', orcid:'ORCID', scopus_id:'Scopus ID', google_scholar:'Google Scholar', research_interests:'Hướng nghiên cứu', biography:'Tiểu sử khoa học', birth_date:'Ngày sinh', birthplace:'Nơi sinh', hometown:'Quê quán', h_index:'H-index', wos_researcher_id:'WoS Researcher ID', research_area:'Lĩnh vực nghiên cứu' }
const publicationColumns = [{ title:'Năm', dataIndex:'year', width:90 }, { title:'Tên công bố', dataIndex:'title', width:320 }, { title:'Tạp chí/NXB', dataIndex:'journal', width:220 }, { title:'Q', dataIndex:'quartile', width:100, render:v => v ? <Tag color="blue">{v}</Tag> : '-' }, { title:'Chỉ mục', dataIndex:'indexed', width:120 }, { title:'DOI/Link', dataIndex:'doi', width:180 }, { title:'Tác giả', dataIndex:'authors', width:220 }, { title:'Điểm', dataIndex:'points', width:100 }]
const projectColumns = [{ title:'Tên đề tài', dataIndex:'project_name', width:320 }, { title:'Vai trò', dataIndex:'role' }, { title:'Cấp', dataIndex:'level' }, { title:'Từ năm', dataIndex:'start_year' }, { title:'Đến năm', dataIndex:'end_year' }, { title:'Trạng thái', dataIndex:'status' }]
const supervisionColumns = [{ title:'Người học', dataIndex:'student_name' }, { title:'Loại', dataIndex:'student_type' }, { title:'Tên đề tài', dataIndex:'thesis_title', width:320 }, { title:'Vai trò', dataIndex:'role' }, { title:'Năm', dataIndex:'year' }, { title:'Trạng thái', dataIndex:'status' }]

function ProfileForm(){ return <><Col span={12}><Form.Item name="email" label="Email"><Input /></Form.Item></Col><Col span={12}><Form.Item name="phone" label="Điện thoại"><Input /></Form.Item></Col><Col span={12}><Form.Item name="academic_rank" label="Học hàm"><Input /></Form.Item></Col><Col span={12}><Form.Item name="degree" label="Học vị"><Input /></Form.Item></Col><Col span={12}><Form.Item name="department" label="Đơn vị"><Input /></Form.Item></Col><Col span={12}><Form.Item name="specialization" label="Chuyên môn"><Input /></Form.Item></Col><Col span={12}><Form.Item name="orcid" label="ORCID"><Input /></Form.Item></Col><Col span={12}><Form.Item name="scopus_id" label="Scopus ID"><Input /></Form.Item></Col><Col span={12}><Form.Item name="google_scholar" label="Google Scholar"><Input /></Form.Item></Col><Col span={24}><Form.Item name="research_interests" label="Hướng nghiên cứu"><Input.TextArea rows={3} /></Form.Item></Col><Col span={24}><Form.Item name="biography" label="Tiểu sử khoa học"><Input.TextArea rows={4} /></Form.Item></Col></> }
function RisForm(){ return <><Col span={12}><Form.Item name="birth_date" label="Ngày sinh"><Input placeholder="YYYY-MM-DD" /></Form.Item></Col><Col span={12}><Form.Item name="birthplace" label="Nơi sinh"><Input /></Form.Item></Col><Col span={12}><Form.Item name="hometown" label="Quê quán"><Input /></Form.Item></Col><Col span={12}><Form.Item name="h_index" label="H-index"><InputNumber min={0} style={{ width:'100%' }} /></Form.Item></Col><Col span={12}><Form.Item name="orcid" label="ORCID"><Input /></Form.Item></Col><Col span={12}><Form.Item name="scopus_id" label="Scopus ID"><Input /></Form.Item></Col><Col span={12}><Form.Item name="google_scholar" label="Google Scholar"><Input /></Form.Item></Col><Col span={12}><Form.Item name="wos_researcher_id" label="WoS Researcher ID"><Input /></Form.Item></Col><Col span={12}><Form.Item name="website" label="Website cá nhân"><Input /></Form.Item></Col><Col span={12}><Form.Item name="research_area" label="Lĩnh vực nghiên cứu"><Input /></Form.Item></Col><Col span={24}><Form.Item name="research_interests" label="Hướng nghiên cứu"><Input.TextArea rows={3} /></Form.Item></Col><Col span={24}><Form.Item name="research_summary" label="Tiểu sử khoa học"><Input.TextArea rows={4} /></Form.Item></Col></> }
function PublicationForm(){ return <><Col span={8}><Form.Item name="year" label="Năm" rules={[{required:true}]}><InputNumber style={{ width:'100%' }} /></Form.Item></Col><Col span={16}><Form.Item name="authors" label="Tác giả"><Input /></Form.Item></Col><Col span={24}><Form.Item name="title" label="Tên công trình" rules={[{required:true}]}><Input /></Form.Item></Col><Col span={12}><Form.Item name="journal" label="Tạp chí/NXB/Hội thảo"><Input /></Form.Item></Col><Col span={12}><Form.Item name="doi" label="DOI/Link"><Input /></Form.Item></Col><Col span={12}><Form.Item name="quartile" label="Q"><Select allowClear options={qOptions} /></Form.Item></Col><Col span={12}><Form.Item name="indexed" label="Chỉ mục"><Select allowClear options={indexOptions} /></Form.Item></Col><Col span={8}><Form.Item name="points" label="Điểm"><InputNumber min={0} step={0.25} style={{ width:'100%' }} /></Form.Item></Col><Col span={24}><Form.Item name="note" label="Ghi chú"><Input.TextArea rows={3} /></Form.Item></Col></> }
function ProjectForm(){ return <><Col span={24}><Form.Item name="project_name" label="Tên đề tài" rules={[{required:true}]}><Input /></Form.Item></Col><Col span={12}><Form.Item name="role" label="Vai trò"><Select options={[{value:'Chủ nhiệm'}, {value:'Thành viên'}, {value:'Thư ký'}]} /></Form.Item></Col><Col span={12}><Form.Item name="level" label="Cấp đề tài"><Select options={[{value:'Cấp cơ sở'}, {value:'Cấp Bộ'}, {value:'Cấp Nhà nước'}, {value:'Khác'}]} /></Form.Item></Col><Col span={8}><Form.Item name="start_year" label="Năm bắt đầu"><InputNumber style={{ width:'100%' }} /></Form.Item></Col><Col span={8}><Form.Item name="end_year" label="Năm kết thúc"><InputNumber style={{ width:'100%' }} /></Form.Item></Col><Col span={8}><Form.Item name="status" label="Trạng thái"><Select options={[{value:'Đang thực hiện'}, {value:'Đã nghiệm thu'}, {value:'Tạm dừng'}]} /></Form.Item></Col><Col span={24}><Form.Item name="note" label="Ghi chú"><Input.TextArea rows={3} /></Form.Item></Col></> }
function SupervisionForm(){ return <><Col span={12}><Form.Item name="student_name" label="Tên người học" rules={[{required:true}]}><Input /></Form.Item></Col><Col span={12}><Form.Item name="student_type" label="Loại"><Select options={[{value:'Học viên cao học'}, {value:'Nghiên cứu sinh'}, {value:'Sinh viên đại học'}]} /></Form.Item></Col><Col span={12}><Form.Item name="role" label="Vai trò"><Select options={[{value:'Hướng dẫn chính'}, {value:'Hướng dẫn phụ'}]} /></Form.Item></Col><Col span={12}><Form.Item name="year" label="Năm"><InputNumber style={{ width:'100%' }} /></Form.Item></Col><Col span={24}><Form.Item name="thesis_title" label="Tên đề tài luận văn/luận án"><Input /></Form.Item></Col><Col span={12}><Form.Item name="status" label="Trạng thái"><Select options={[{value:'Đang hướng dẫn'}, {value:'Đã bảo vệ'}, {value:'Tạm dừng'}]} /></Form.Item></Col></> }
function TeachingTable({ loading, data }) { return <Card><Table rowKey="id" loading={loading} dataSource={data} columns={[{ title:'Mã lớp', dataIndex:'class_code' }, { title:'Học phần', render:(_, r) => r.study_plans?.courses?.course_name || r.study_plans?.courses?.name || '-' }, { title:'CTĐT', render:(_, r) => r.study_plans?.programs?.program_code || r.study_plans?.programs?.code || '-' }, { title:'Sĩ số', render:(_, r) => `${r.current_students || 0}/${r.max_students || 0}` }, { title:'Bắt đầu', dataIndex:'start_date' }, { title:'Kết thúc', dataIndex:'end_date' }]} /></Card> }
