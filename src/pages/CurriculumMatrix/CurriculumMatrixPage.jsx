import React, { useEffect, useMemo, useState } from 'react'
import { Button, Card, Col, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Statistic, Table, Tabs, Tag, Typography, message } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SaveOutlined, DownloadOutlined, DatabaseOutlined } from '@ant-design/icons'
import {
  deleteEntity,
  loadMatrixData,
  seedMbaSample,
  setAssessmentClo,
  setCloPlo,
  setCoursePlo,
  setJobPlo,
  setPoPlo,
  upsertEntity,
} from '../../services/curriculumMatrixService.js'

const { Title, Text } = Typography
const { TextArea } = Input

const groups = ['Kiến thức', 'Kỹ năng', 'Tự chủ và trách nhiệm'].map((x) => ({ value: x, label: x }))
const hmLevels = ['', 'H', 'M', 'L'].map((x) => ({ value: x, label: x || '-' }))
const xLevels = ['', 'X'].map((x) => ({ value: x, label: x || '-' }))
const bloomOptions = [1,2,3,4,5,6].map((x)=>({ value: x, label: `Bậc ${x}` }))

function cellKey(a, b) { return `${a}__${b}` }
function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function EntityModal({ open, onCancel, onSave, kind, initial, programs, courses }) {
  const [form] = Form.useForm()
  useEffect(() => { if (open) form.setFieldsValue(initial || {}) }, [open, initial, form])
  const save = async () => onSave(await form.validateFields())
  const common = <Form.Item name="id" hidden><Input /></Form.Item>
  const programField = <Form.Item name="program_id" label="Chương trình" rules={[{ required: true }]}><Select options={programs.map(p=>({value:p.id,label:p.name}))} /></Form.Item>
  const courseField = <Form.Item name="course_id" label="Học phần" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={courses.map(c=>({value:c.id,label:`${c.course_code || ''} - ${c.course_name}`}))} /></Form.Item>
  return <Modal open={open} onCancel={onCancel} onOk={save} title="Cập nhật dữ liệu" width={760} okText="Lưu" cancelText="Hủy">
    <Form form={form} layout="vertical">{common}
      {kind === 'pos' && <><Row gutter={16}><Col span={12}>{programField}</Col><Col span={6}><Form.Item name="code" label="Mã PO" rules={[{ required:true }]}><Input /></Form.Item></Col><Col span={6}><Form.Item name="group_name" label="Khối"><Select options={groups} /></Form.Item></Col></Row><Form.Item name="description" label="Nội dung PO" rules={[{ required:true }]}><TextArea rows={4}/></Form.Item><Form.Item name="sort_order" label="Thứ tự"><InputNumber style={{width:'100%'}}/></Form.Item></>}
      {kind === 'plos' && <><Row gutter={16}><Col span={8}>{programField}</Col><Col span={4}><Form.Item name="code" label="Mã PLO" rules={[{ required:true }]}><Input /></Form.Item></Col><Col span={4}><Form.Item name="sub_code" label="Mã phụ"><Input placeholder="K1/S1/A1" /></Form.Item></Col><Col span={4}><Form.Item name="group_name" label="Nhóm"><Select options={groups} /></Form.Item></Col><Col span={4}><Form.Item name="bloom_level" label="Bloom"><InputNumber min={1} max={6} style={{width:'100%'}} /></Form.Item></Col></Row><Form.Item name="description" label="Nội dung PLO" rules={[{ required:true }]}><TextArea rows={4}/></Form.Item><Form.Item name="job_positions" label="Vị trí việc làm phù hợp"><TextArea rows={2}/></Form.Item><Form.Item name="sort_order" label="Thứ tự"><InputNumber style={{width:'100%'}}/></Form.Item></>}
      {kind === 'jobs' && <><Row gutter={16}><Col span={12}>{programField}</Col><Col span={12}><Form.Item name="name" label="Vị trí việc làm" rules={[{ required:true }]}><Input /></Form.Item></Col></Row><Form.Item name="workplace" label="Nơi làm việc"><TextArea rows={4}/></Form.Item><Form.Item name="sort_order" label="Thứ tự"><InputNumber style={{width:'100%'}}/></Form.Item></>}
      {kind === 'courses' && <><Row gutter={16}><Col span={8}>{programField}</Col><Col span={4}><Form.Item name="course_code" label="Mã HP"><Input /></Form.Item></Col><Col span={8}><Form.Item name="course_name" label="Học phần" rules={[{ required:true }]}><Input /></Form.Item></Col><Col span={4}><Form.Item name="credits" label="TC"><InputNumber min={0} style={{width:'100%'}} /></Form.Item></Col></Row><Row gutter={16}><Col span={8}><Form.Item name="knowledge_block" label="Khối kiến thức"><Input /></Form.Item></Col><Col span={8}><Form.Item name="course_type" label="Loại HP"><Input /></Form.Item></Col><Col span={8}><Form.Item name="sort_order" label="Thứ tự"><InputNumber style={{width:'100%'}}/></Form.Item></Col></Row></>}
      {kind === 'clos' && <><Row gutter={16}><Col span={10}>{courseField}</Col><Col span={4}><Form.Item name="code" label="Mã CLO" rules={[{ required:true }]}><Input /></Form.Item></Col><Col span={5}><Form.Item name="group_name" label="Nhóm"><Select options={groups}/></Form.Item></Col><Col span={5}><Form.Item name="bloom_level" label="Bloom"><InputNumber min={1} max={6} style={{width:'100%'}}/></Form.Item></Col></Row><Form.Item name="description" label="Nội dung CLO" rules={[{ required:true }]}><TextArea rows={4}/></Form.Item><Row gutter={16}><Col span={8}><Form.Item name="weight" label="Trọng số"><InputNumber min={0} max={1} step={0.1} style={{width:'100%'}}/></Form.Item></Col><Col span={16}><Form.Item name="assessment_methods" label="Phương pháp đánh giá"><Input /></Form.Item></Col></Row><Form.Item name="sort_order" label="Thứ tự"><InputNumber style={{width:'100%'}}/></Form.Item></>}
      {kind === 'assessments' && <><Row gutter={16}><Col span={10}>{courseField}</Col><Col span={8}><Form.Item name="name" label="Nội dung đánh giá" rules={[{ required:true }]}><Input /></Form.Item></Col><Col span={6}><Form.Item name="percentage" label="Tỷ lệ %"><InputNumber min={0} max={100} style={{width:'100%'}} /></Form.Item></Col></Row><Row gutter={16}><Col span={8}><Form.Item name="method" label="Phương thức"><Input /></Form.Item></Col><Col span={8}><Form.Item name="timing" label="Thời điểm"><Input /></Form.Item></Col><Col span={8}><Form.Item name="sort_order" label="Thứ tự"><InputNumber style={{width:'100%'}}/></Form.Item></Col></Row></>}
    </Form>
  </Modal>
}

export default function CurriculumMatrixPage() {
  const [data, setData] = useState({ program:null, pos:[], plos:[], jobs:[], courses:[], clos:[], assessments:[], matrices:{poPlo:[],jobPlo:[],coursePlo:[],cloPlo:[],assessmentClo:[]} })
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState({ open:false, kind:'pos', initial:null })

  const programs = data.program ? [data.program] : []
  const load = async () => { setLoading(true); try { setData(await loadMatrixData()) } catch(e){ message.error(e.message) } finally { setLoading(false) } }
  useEffect(()=>{ load() }, [])

  const index = useMemo(() => ({
    poPlo: Object.fromEntries(data.matrices.poPlo.map(x=>[cellKey(x.po_id,x.plo_id), x.contribution])),
    jobPlo: Object.fromEntries(data.matrices.jobPlo.map(x=>[cellKey(x.job_id,x.plo_id), x.level])),
    coursePlo: Object.fromEntries(data.matrices.coursePlo.map(x=>[cellKey(x.course_id,x.plo_id), x.level])),
    cloPlo: Object.fromEntries(data.matrices.cloPlo.map(x=>[cellKey(x.clo_id,x.plo_id), x.level])),
    assessmentClo: Object.fromEntries(data.matrices.assessmentClo.map(x=>[cellKey(x.assessment_id,x.clo_id), x.weight])),
  }), [data])

  const filteredCourses = data.courses.filter(c => `${c.course_code} ${c.course_name}`.toLowerCase().includes(search.toLowerCase()))
  const filteredClos = data.clos.filter(c => {
    const course = data.courses.find(x=>x.id===c.course_id)
    return `${c.code} ${c.description} ${course?.course_name || ''}`.toLowerCase().includes(search.toLowerCase())
  })

  const openAdd = (kind, initial={}) => setModal({ open:true, kind, initial: { program_id: data.program?.id, ...initial } })
  const saveEntity = async (values) => { try { await upsertEntity(modal.kind, values); setModal({ ...modal, open:false }); message.success('Đã lưu'); load() } catch(e){ message.error(e.message) } }
  const remove = async (kind, id) => { await deleteEntity(kind, id); message.success('Đã xóa'); load() }

  const entityTable = (kind, rows, columns) => <Card extra={<Button type="primary" icon={<PlusOutlined/>} onClick={()=>openAdd(kind)}>Thêm</Button>}>
    <Table loading={loading} rowKey="id" dataSource={rows} columns={[...columns, { title:'Thao tác', width:110, render:(_,r)=><Space><Button icon={<EditOutlined/>} onClick={()=>openAdd(kind,r)} /><Popconfirm title="Xóa dòng này?" onConfirm={()=>remove(kind,r.id)}><Button danger icon={<DeleteOutlined/>}/></Popconfirm></Space> }]} />
  </Card>

  const matrixColumns = (leftTitle, leftRender, headers, getValue, setValue, options) => [
    { title:leftTitle, dataIndex:'_left', fixed:'left', width:280, render:leftRender },
    ...headers.map(h => ({ title:<div style={{textAlign:'center'}}>{h.code || h.sub_code || h.name}<br/><Text type="secondary">{h.bloom_level ? `(${h.bloom_level})` : ''}</Text></div>, width:110, align:'center', render:(_, row)=><Select size="small" style={{width:80}} options={options} value={getValue(row,h) || ''} onChange={async(v)=>{ await setValue(row,h,v); await load() }} /> }))
  ]

  const exportCoursePlo = () => downloadCsv('ma-tran-hoc-phan-plo.csv', [['Mã HP','Học phần',...data.plos.map(p=>p.code)], ...data.courses.map(c=>[c.course_code,c.course_name,...data.plos.map(p=>index.coursePlo[cellKey(c.id,p.id)] || '')])])

  const stats = {
    po: data.pos.length, plo: data.plos.length, courses: data.courses.length, clos: data.clos.length,
  }

  return <div style={{ padding:24 }}>
    <Row justify="space-between" align="middle">
      <Col><Title level={2}>Ma trận CTĐT</Title><Text type="secondary">Kết nối PO → PLO → Học phần → CLO → Đánh giá.</Text></Col>
      <Col><Space><Button icon={<DatabaseOutlined/>} onClick={async()=>{ await seedMbaSample(); message.success('Đã nạp dữ liệu mẫu'); load() }}>Nạp mẫu MBA</Button><Button icon={<ReloadOutlined/>} onClick={load}>Tải lại</Button></Space></Col>
    </Row>
    <Row gutter={16} style={{marginTop:16, marginBottom:16}}><Col span={6}><Card><Statistic title="PO" value={stats.po}/></Card></Col><Col span={6}><Card><Statistic title="PLO" value={stats.plo}/></Card></Col><Col span={6}><Card><Statistic title="Học phần" value={stats.courses}/></Card></Col><Col span={6}><Card><Statistic title="CLO" value={stats.clos}/></Card></Col></Row>

    <Card>
      <Space style={{ marginBottom:16 }}><Input.Search placeholder="Tìm học phần, CLO..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:340}}/><Button icon={<DownloadOutlined/>} onClick={exportCoursePlo}>Xuất Course-PLO CSV</Button></Space>
      <Tabs items={[
        { key:'po', label:'1. PO', children: entityTable('pos', data.pos, [{title:'Mã',dataIndex:'code',width:100},{title:'Khối',dataIndex:'group_name',width:180},{title:'Nội dung',dataIndex:'description'}]) },
        { key:'plo', label:'2. PLO', children: entityTable('plos', data.plos, [{title:'PLO',dataIndex:'code',width:90},{title:'Mã phụ',dataIndex:'sub_code',width:90},{title:'Nhóm',dataIndex:'group_name',width:170},{title:'Nội dung',dataIndex:'description'},{title:'Bloom',dataIndex:'bloom_level',width:90,render:v=><Tag color="blue">{v}</Tag>}]) },
        { key:'job', label:'3. Vị trí việc làm', children: entityTable('jobs', data.jobs, [{title:'Vị trí việc làm',dataIndex:'name',width:280},{title:'Nơi làm việc',dataIndex:'workplace'}]) },
        { key:'course', label:'4. Học phần', children: entityTable('courses', filteredCourses, [{title:'Mã HP',dataIndex:'course_code',width:120},{title:'Học phần',dataIndex:'course_name'},{title:'TC',dataIndex:'credits',width:80},{title:'Khối',dataIndex:'knowledge_block',width:180}]) },
        { key:'clo', label:'5. CLO & Bloom', children: entityTable('clos', filteredClos, [{title:'Học phần',dataIndex:'course_id',width:260,render:v=>data.courses.find(c=>c.id===v)?.course_name},{title:'CLO',dataIndex:'code',width:100},{title:'Nội dung',dataIndex:'description'},{title:'Nhóm',dataIndex:'group_name',width:170},{title:'Bloom',dataIndex:'bloom_level',width:90,render:v=><Tag color="purple">Bậc {v}</Tag>},{title:'Trọng số',dataIndex:'weight',width:100}]) },
        { key:'poPlo', label:'6. Ma trận PO-PLO', children:<Table rowKey="id" bordered size="small" scroll={{x:1400}} dataSource={data.plos} columns={matrixColumns('PLO', r=><><b>{r.code}</b> - {r.sub_code}<br/><Text>{r.description}</Text></>, data.pos, (r,h)=>index.poPlo[cellKey(h.id,r.id)], (r,h,v)=>setPoPlo({po_id:h.id, plo_id:r.id, contribution:v}), xLevels)} /> },
        { key:'jobPlo', label:'7. Vị trí-PLO', children:<Table rowKey="id" bordered size="small" scroll={{x:1400}} dataSource={data.jobs} columns={matrixColumns('Vị trí việc làm', r=><b>{r.name}</b>, data.plos, (r,h)=>index.jobPlo[cellKey(r.id,h.id)], (r,h,v)=>setJobPlo({job_id:r.id, plo_id:h.id, level:v}), hmLevels)} /> },
        { key:'coursePlo', label:'8. Học phần-PLO', children:<Table rowKey="id" bordered size="small" scroll={{x:1500}} dataSource={filteredCourses} columns={matrixColumns('Học phần', r=><><b>{r.course_code}</b><br/>{r.course_name}</>, data.plos, (r,h)=>index.coursePlo[cellKey(r.id,h.id)], (r,h,v)=>setCoursePlo({course_id:r.id, plo_id:h.id, level:v ? Number(v) : ''}), ['',1,2,3,4,5,6].map(x=>({value:x,label:x || '-'})))} /> },
        { key:'cloPlo', label:'9. CLO-PLO', children:<Table rowKey="id" bordered size="small" scroll={{x:1500}} dataSource={filteredClos} columns={matrixColumns('CLO', r=><><b>{r.code}</b><br/><Text>{data.courses.find(c=>c.id===r.course_id)?.course_name}</Text><br/>{r.description}</>, data.plos, (r,h)=>index.cloPlo[cellKey(r.id,h.id)], (r,h,v)=>setCloPlo({clo_id:r.id, plo_id:h.id, level:v}), hmLevels)} /> },
        { key:'assessment', label:'10. Đánh giá', children:<><div style={{marginBottom:12}}><Button type="primary" onClick={()=>openAdd('assessments')} icon={<PlusOutlined/>}>Thêm đánh giá</Button></div><Table rowKey="id" dataSource={data.assessments} columns={[{title:'Học phần',dataIndex:'course_id',render:v=>data.courses.find(c=>c.id===v)?.course_name},{title:'Đánh giá',dataIndex:'name'},{title:'Phương thức',dataIndex:'method'},{title:'Tỷ lệ',dataIndex:'percentage',render:v=>`${v||0}%`},{title:'Thao tác',render:(_,r)=><Space><Button icon={<EditOutlined/>} onClick={()=>openAdd('assessments',r)}/><Popconfirm title="Xóa?" onConfirm={()=>remove('assessments',r.id)}><Button danger icon={<DeleteOutlined/>}/></Popconfirm></Space>}]} /></> },
      ]} />
    </Card>
    <EntityModal open={modal.open} kind={modal.kind} initial={modal.initial} programs={programs} courses={data.courses} onCancel={()=>setModal({...modal,open:false})} onSave={saveEntity} />
  </div>
}
