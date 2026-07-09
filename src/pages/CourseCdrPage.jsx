import React, { useEffect, useMemo, useState } from 'react'
import {
  Button, Card, Col, Empty, Form, Input, InputNumber, Modal, Popconfirm, Row,
  Select, Space, Statistic, Table, Tabs, Tag, Typography, message,
} from 'antd'
import {
  DeleteOutlined, DownOutlined, EditOutlined, ExportOutlined, PlusOutlined,
  ReloadOutlined, SaveOutlined, SearchOutlined,
} from '@ant-design/icons'
import {
  deleteClo, deleteCourse, deleteMapping, deletePlo, downloadCsv,
  loadCourseCdrData, saveClo, saveCourse, saveMapping, savePlo,
} from '../services/courseCdrService.js'

const { Title, Text } = Typography
const { TextArea } = Input

const groupOptions = ['Kiến thức', 'Kỹ năng', 'Mức độ tự chủ và trách nhiệm'].map((value) => ({ value, label: value }))
const bloomOptions = [1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: `Bậc ${n}` }))
const levelOptions = ['H', 'M', 'L'].map((value) => ({ value, label: value }))
const assessmentOptions = ['Kiểm tra giữa kỳ', 'Thi kết thúc', 'Bài tập nhóm', 'Thuyết trình', 'Tiểu luận', 'Dự án', 'Chuyên cần'].map((value) => ({ value, label: value }))

function EmptyState({ text = 'Chưa có dữ liệu' }) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={text} />
}

export default function CourseCdrPage() {
  const [data, setData] = useState({ courses: [], plos: [], clos: [], mappings: [] })
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [courseFilter, setCourseFilter] = useState(null)
  const [activeTab, setActiveTab] = useState('clo')

  const [courseModal, setCourseModal] = useState(false)
  const [ploModal, setPloModal] = useState(false)
  const [cloModal, setCloModal] = useState(false)
  const [mappingModal, setMappingModal] = useState(false)
  const [courseForm] = Form.useForm()
  const [ploForm] = Form.useForm()
  const [cloForm] = Form.useForm()
  const [mappingForm] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      setData(await loadCourseCdrData())
    } catch (e) {
      message.error(e.message || 'Không tải được dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const courseOptions = data.courses.map((c) => ({ value: c.id, label: `${c.course_code || ''} - ${c.course_name}` }))
  const ploOptions = data.plos.map((p) => ({ value: p.id, label: `${p.plo_code} - ${p.description || ''}` }))
  const cloOptions = data.clos.map((c) => ({ value: c.id, label: `${c.clo_code} - ${c.content || ''}` }))

  const closFiltered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return data.clos.filter((x) => {
      const courseName = x.course?.course_name || ''
      const okCourse = !courseFilter || x.course_id === courseFilter
      const okKeyword = !kw || [x.clo_code, x.content, x.group_name, courseName].join(' ').toLowerCase().includes(kw)
      return okCourse && okKeyword
    })
  }, [data.clos, keyword, courseFilter])

  const groupedClos = useMemo(() => {
    const map = new Map()
    closFiltered.forEach((clo) => {
      const key = clo.course_id || 'none'
      if (!map.has(key)) map.set(key, { course: clo.course, rows: [] })
      map.get(key).rows.push(clo)
    })
    return Array.from(map.values())
  }, [closFiltered])

  const stats = useMemo(() => ({
    courses: data.courses.length,
    plos: data.plos.length,
    clos: data.clos.length,
    mappings: data.mappings.length,
  }), [data])

  const openCourse = (row) => {
    courseForm.resetFields()
    courseForm.setFieldsValue(row || { credits: 3 })
    setCourseModal(true)
  }

  const openPlo = (row) => {
    ploForm.resetFields()
    ploForm.setFieldsValue(row || { sort_order: data.plos.length + 1 })
    setPloModal(true)
  }

  const openClo = (row) => {
    cloForm.resetFields()
    cloForm.setFieldsValue(row || { bloom_level: 4, weight: 0.4, group_name: 'Kiến thức' })
    setCloModal(true)
  }

  const openMapping = (row) => {
    mappingForm.resetFields()
    mappingForm.setFieldsValue(row || { level: 'M' })
    setMappingModal(true)
  }

  const submitCourse = async () => {
    try {
      await saveCourse(await courseForm.validateFields())
      message.success('Đã lưu học phần')
      setCourseModal(false); load()
    } catch (e) { message.error(e.message || 'Không lưu được') }
  }

  const submitPlo = async () => {
    try {
      await savePlo(await ploForm.validateFields())
      message.success('Đã lưu PLO')
      setPloModal(false); load()
    } catch (e) { message.error(e.message || 'Không lưu được') }
  }

  const submitClo = async () => {
    try {
      const values = await cloForm.validateFields()
      await saveClo({ ...values, assessment_methods: Array.isArray(values.assessment_methods) ? values.assessment_methods.join('; ') : values.assessment_methods })
      message.success('Đã lưu CLO')
      setCloModal(false); load()
    } catch (e) { message.error(e.message || 'Không lưu được') }
  }

  const submitMapping = async () => {
    try {
      await saveMapping(await mappingForm.validateFields())
      message.success('Đã lưu mapping')
      setMappingModal(false); load()
    } catch (e) { message.error(e.message || 'Không lưu được') }
  }

  const cloColumns = [
    { title: 'STT', width: 70, align: 'center', render: (_, __, i) => i + 1 },
    { title: 'Học phần', dataIndex: ['course', 'course_name'], width: 230 },
    { title: 'Mã CLO', dataIndex: 'clo_code', width: 100 },
    { title: 'Nội dung CLO', dataIndex: 'content' },
    { title: 'Nhóm', dataIndex: 'group_name', width: 160 },
    { title: 'Bloom', dataIndex: 'bloom_level', width: 90, align: 'center' },
    { title: 'Trọng số', dataIndex: 'weight', width: 90, align: 'center' },
    { title: 'Đánh giá', dataIndex: 'bloom_level', width: 110, render: (v) => <Tag color="purple">Bậc {v}</Tag> },
    { title: 'Phương pháp đánh giá', dataIndex: 'assessment_methods', width: 190 },
    { title: 'Thao tác', width: 130, align: 'center', render: (_, r) => <Space>
      <Button size="small" icon={<EditOutlined />} onClick={() => openClo({ ...r, assessment_methods: r.assessment_methods ? String(r.assessment_methods).split(';').map((x) => x.trim()).filter(Boolean) : [] })}>Sửa</Button>
      <Popconfirm title="Xóa CLO này?" onConfirm={async () => { await deleteClo(r.id); message.success('Đã xóa'); load() }}>
        <Button size="small" danger icon={<DeleteOutlined />} />
      </Popconfirm>
    </Space> },
  ]

  const courseColumns = [
    { title: 'Mã HP', dataIndex: 'course_code', width: 130 },
    { title: 'Tên học phần', dataIndex: 'course_name' },
    { title: 'Tên tiếng Anh', dataIndex: 'english_name' },
    { title: 'TC', dataIndex: 'credits', width: 80, align: 'center' },
    { title: 'Khối kiến thức', dataIndex: 'knowledge_block', width: 200 },
    { title: 'Thao tác', width: 140, align: 'center', render: (_, r) => <Space>
      <Button size="small" icon={<EditOutlined />} onClick={() => openCourse(r)}>Sửa</Button>
      <Popconfirm title="Xóa học phần này?" onConfirm={async () => { await deleteCourse(r.id); message.success('Đã xóa'); load() }}>
        <Button size="small" danger icon={<DeleteOutlined />} />
      </Popconfirm>
    </Space> },
  ]

  const ploColumns = [
    { title: 'Mã PLO', dataIndex: 'plo_code', width: 120 },
    { title: 'Mô tả PLO', dataIndex: 'description' },
    { title: 'Nhóm', dataIndex: 'group_name', width: 180 },
    { title: 'Bloom', dataIndex: 'bloom_level', width: 90, align: 'center' },
    { title: 'Thứ tự', dataIndex: 'sort_order', width: 90, align: 'center' },
    { title: 'Thao tác', width: 140, align: 'center', render: (_, r) => <Space>
      <Button size="small" icon={<EditOutlined />} onClick={() => openPlo(r)}>Sửa</Button>
      <Popconfirm title="Xóa PLO này?" onConfirm={async () => { await deletePlo(r.id); message.success('Đã xóa'); load() }}>
        <Button size="small" danger icon={<DeleteOutlined />} />
      </Popconfirm>
    </Space> },
  ]

  const mappingColumns = [
    { title: 'CLO', dataIndex: ['clo', 'clo_code'], width: 120 },
    { title: 'Nội dung CLO', dataIndex: ['clo', 'content'] },
    { title: 'PLO', dataIndex: ['plo', 'plo_code'], width: 120 },
    { title: 'Mức liên kết', dataIndex: 'level', width: 130, align: 'center', render: (v) => <Tag color={v === 'H' ? 'green' : v === 'M' ? 'blue' : 'default'}>{v}</Tag> },
    { title: 'Ghi chú', dataIndex: 'note' },
    { title: 'Thao tác', width: 130, align: 'center', render: (_, r) => <Space>
      <Button size="small" icon={<EditOutlined />} onClick={() => openMapping(r)}>Sửa</Button>
      <Popconfirm title="Xóa mapping này?" onConfirm={async () => { await deleteMapping(r.id); message.success('Đã xóa'); load() }}>
        <Button size="small" danger icon={<DeleteOutlined />} />
      </Popconfirm>
    </Space> },
  ]

  const matrixRows = data.clos.map((clo) => {
    const row = { key: clo.id, clo: clo.clo_code, content: clo.content }
    data.plos.forEach((plo) => {
      row[plo.plo_code] = data.mappings.find((m) => m.clo_id === clo.id && m.plo_id === plo.id)?.level || ''
    })
    return row
  })
  const matrixColumns = [
    { title: 'CLO', dataIndex: 'clo', fixed: 'left', width: 100 },
    { title: 'Nội dung', dataIndex: 'content', fixed: 'left', width: 300 },
    ...data.plos.map((p) => ({ title: p.plo_code, dataIndex: p.plo_code, width: 90, align: 'center', render: (v) => v ? <Tag>{v}</Tag> : '' })),
  ]

  return (
    <div className="course-cdr-page">
      <style>{`
        .course-cdr-page{padding:24px;background:#f6f8fb;min-height:100vh}.page-head{margin-bottom:18px}.muted{color:#667085}.toolbar{background:#fff;border:1px solid #eef0f4;border-radius:14px;padding:16px;margin-top:16px}.soft-card{border-radius:14px;box-shadow:0 8px 24px rgba(15,23,42,.05)}.course-group{background:#eef6ff!important;font-weight:700;color:#0b5cab}.course-group .ant-table-cell{border-top:1px solid #d7e8ff!important}.form-panel{margin-top:18px}.ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn{font-weight:700}.ant-btn-primary{box-shadow:0 6px 14px rgba(22,119,255,.25)}
      `}</style>
      <div className="page-head">
        <Title level={2} style={{ marginBottom: 0 }}>Học phần & CĐR</Title>
        <Text className="muted">Quản lý học phần, PLO, CLO theo Bloom, mapping CLO–PLO và ma trận liên kết.</Text>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card className="soft-card"><Statistic title="Học phần" value={stats.courses} /></Card></Col>
        <Col span={6}><Card className="soft-card"><Statistic title="PLO" value={stats.plos} /></Card></Col>
        <Col span={6}><Card className="soft-card"><Statistic title="CLO" value={stats.clos} /></Card></Col>
        <Col span={6}><Card className="soft-card"><Statistic title="Mapping" value={stats.mappings} /></Card></Col>
      </Row>

      <Card className="soft-card">
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          { key: 'plo', label: 'PLO', children: <>
            <Space style={{ marginBottom: 14 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openPlo()}>Thêm PLO</Button>
              <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
            </Space>
            <Table rowKey="id" loading={loading} dataSource={data.plos} columns={ploColumns} pagination={{ pageSize: 10 }} />
          </> },
          { key: 'clo', label: 'CLO & Bloom', children: <>
            <div className="toolbar">
              <Space wrap>
                <Input prefix={<SearchOutlined />} allowClear placeholder="Tìm CLO, học phần, nhóm..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ width: 340 }} />
                <Select allowClear suffixIcon={<DownOutlined />} placeholder="Lọc theo học phần" value={courseFilter} onChange={setCourseFilter} options={courseOptions} style={{ width: 300 }} />
                <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
                <Button icon={<ExportOutlined />} onClick={() => downloadCsv('clo_bloom.csv', closFiltered)}>Xuất CSV</Button>
              </Space>
              <div style={{ marginTop: 16 }}><Button type="primary" icon={<PlusOutlined />} onClick={() => openClo()}>Thêm CLO</Button></div>
            </div>
            <Table
              rowKey="id"
              loading={loading}
              dataSource={closFiltered}
              columns={cloColumns}
              pagination={{ pageSize: 20, showSizeChanger: true }}
              scroll={{ x: 1300 }}
              style={{ marginTop: 16 }}
              locale={{ emptyText: <EmptyState text="Chưa có CLO" /> }}
              expandable={{
                defaultExpandAllRows: true,
                expandedRowRender: () => null,
                rowExpandable: () => false,
              }}
              rowClassName={(record, index) => index === 0 || closFiltered[index - 1]?.course_id !== record.course_id ? '' : ''}
            />
            <Card className="form-panel" title="Cập nhật CLO" size="small">
              <InlineCloForm courseOptions={courseOptions} onSave={async (values) => { await saveClo(values); message.success('Đã lưu CLO'); load() }} />
            </Card>
          </> },
          { key: 'mapping', label: 'Mapping CLO - PLO', children: <>
            <Space style={{ marginBottom: 14 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openMapping()}>Thêm mapping</Button>
              <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
            </Space>
            <Table rowKey="id" loading={loading} dataSource={data.mappings} columns={mappingColumns} pagination={{ pageSize: 10 }} />
          </> },
          { key: 'matrix', label: 'Ma trận liên kết', children: <Table rowKey="key" loading={loading} dataSource={matrixRows} columns={matrixColumns} scroll={{ x: 500 + data.plos.length * 90 }} pagination={false} /> },
          { key: 'courses', label: 'Học phần', children: <>
            <Space style={{ marginBottom: 14 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openCourse()}>Thêm học phần</Button>
              <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
            </Space>
            <Table rowKey="id" loading={loading} dataSource={data.courses} columns={courseColumns} pagination={{ pageSize: 10 }} />
          </> },
          { key: 'report', label: 'Báo cáo', children: <Report data={data} /> },
        ]} />
      </Card>

      <Modal open={courseModal} title="Cập nhật học phần" onCancel={() => setCourseModal(false)} onOk={submitCourse} okText="Lưu" cancelText="Hủy">
        <Form form={courseForm} layout="vertical"><Form.Item name="id" hidden><Input /></Form.Item>
          <Form.Item name="course_code" label="Mã học phần" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="course_name" label="Tên học phần" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="english_name" label="Tên tiếng Anh"><Input /></Form.Item>
          <Row gutter={12}><Col span={12}><Form.Item name="credits" label="Tín chỉ"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col><Col span={12}><Form.Item name="knowledge_block" label="Khối kiến thức"><Input /></Form.Item></Col></Row>
        </Form>
      </Modal>

      <Modal open={ploModal} title="Cập nhật PLO" onCancel={() => setPloModal(false)} onOk={submitPlo} okText="Lưu" cancelText="Hủy">
        <Form form={ploForm} layout="vertical"><Form.Item name="id" hidden><Input /></Form.Item>
          <Form.Item name="plo_code" label="Mã PLO" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Mô tả PLO" rules={[{ required: true }]}><TextArea rows={3} /></Form.Item>
          <Row gutter={12}><Col span={12}><Form.Item name="group_name" label="Nhóm"><Select options={groupOptions} /></Form.Item></Col><Col span={12}><Form.Item name="bloom_level" label="Bloom"><Select options={bloomOptions} /></Form.Item></Col></Row>
          <Form.Item name="sort_order" label="Thứ tự"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>

      <Modal open={cloModal} title="Cập nhật CLO" onCancel={() => setCloModal(false)} onOk={submitClo} okText="Lưu" cancelText="Hủy" width={760}>
        <CloForm form={cloForm} courseOptions={courseOptions} />
      </Modal>

      <Modal open={mappingModal} title="Cập nhật mapping CLO - PLO" onCancel={() => setMappingModal(false)} onOk={submitMapping} okText="Lưu" cancelText="Hủy">
        <Form form={mappingForm} layout="vertical"><Form.Item name="id" hidden><Input /></Form.Item>
          <Form.Item name="clo_id" label="CLO" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={cloOptions} /></Form.Item>
          <Form.Item name="plo_id" label="PLO" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={ploOptions} /></Form.Item>
          <Form.Item name="level" label="Mức liên kết" rules={[{ required: true }]}><Select options={levelOptions} /></Form.Item>
          <Form.Item name="note" label="Ghi chú"><TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

function CloForm({ form, courseOptions }) {
  return <Form form={form} layout="vertical"><Form.Item name="id" hidden><Input /></Form.Item>
    <Row gutter={16}>
      <Col span={12}><Form.Item name="course_id" label="Học phần" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={courseOptions} /></Form.Item></Col>
      <Col span={12}><Form.Item name="group_name" label="Nhóm" rules={[{ required: true }]}><Select options={groupOptions} /></Form.Item></Col>
      <Col span={12}><Form.Item name="clo_code" label="Mã CLO" rules={[{ required: true }]}><Input /></Form.Item></Col>
      <Col span={12}><Form.Item name="bloom_level" label="Bloom" rules={[{ required: true }]}><Select options={bloomOptions} /></Form.Item></Col>
      <Col span={24}><Form.Item name="content" label="Nội dung CLO" rules={[{ required: true }]}><TextArea rows={3} /></Form.Item></Col>
      <Col span={12}><Form.Item name="weight" label="Trọng số"><InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
      <Col span={12}><Form.Item name="assessment_methods" label="Phương pháp đánh giá"><Select mode="multiple" allowClear options={assessmentOptions} /></Form.Item></Col>
      <Col span={24}><Form.Item name="note" label="Ghi chú"><TextArea rows={3} /></Form.Item></Col>
    </Row>
  </Form>
}

function InlineCloForm({ courseOptions, onSave }) {
  const [form] = Form.useForm()
  return <Form form={form} layout="vertical" onFinish={async (v) => { await onSave({ ...v, assessment_methods: Array.isArray(v.assessment_methods) ? v.assessment_methods.join('; ') : v.assessment_methods }); form.resetFields() }} initialValues={{ bloom_level: 4, weight: 0.4, group_name: 'Kiến thức' }}>
    <Row gutter={16}>
      <Col span={7}><Form.Item name="course_id" label="Học phần" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={courseOptions} /></Form.Item></Col>
      <Col span={5}><Form.Item name="clo_code" label="Mã CLO" rules={[{ required: true }]}><Input /></Form.Item></Col>
      <Col span={5}><Form.Item name="group_name" label="Nhóm"><Select options={groupOptions} /></Form.Item></Col>
      <Col span={3}><Form.Item name="bloom_level" label="Bloom"><Select options={bloomOptions} /></Form.Item></Col>
      <Col span={4}><Form.Item name="weight" label="Trọng số"><InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
      <Col span={10}><Form.Item name="content" label="Nội dung CLO" rules={[{ required: true }]}><TextArea rows={3} /></Form.Item></Col>
      <Col span={9}><Form.Item name="assessment_methods" label="Phương pháp đánh giá"><Select mode="multiple" allowClear options={assessmentOptions} /></Form.Item></Col>
      <Col span={5} style={{ display: 'flex', alignItems: 'end', justifyContent: 'end' }}><Space><Button htmlType="reset">Hủy</Button><Button type="primary" htmlType="submit" icon={<SaveOutlined />}>Lưu</Button></Space></Col>
    </Row>
  </Form>
}

function Report({ data }) {
  const byCourse = data.courses.map((c) => ({
    course: c.course_name,
    clos: data.clos.filter((x) => x.course_id === c.id).length,
    weight: data.clos.filter((x) => x.course_id === c.id).reduce((s, x) => s + Number(x.weight || 0), 0),
  }))
  return <Table rowKey="course" dataSource={byCourse} pagination={false} columns={[
    { title: 'Học phần', dataIndex: 'course' },
    { title: 'Số CLO', dataIndex: 'clos', align: 'center' },
    { title: 'Tổng trọng số', dataIndex: 'weight', align: 'center', render: (v) => Number(v).toFixed(2) },
  ]} />
}
