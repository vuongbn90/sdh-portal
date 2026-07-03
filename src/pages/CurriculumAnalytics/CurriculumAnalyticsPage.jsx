import { BarChartOutlined, DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Input, Progress, Select, Space, Table, Tag, Tabs, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

function pct(value) {
  const n = Number(value || 0)
  return Math.max(0, Math.min(100, Math.round(n)))
}

function statusTag(value, target = 80) {
  const n = Number(value || 0)
  if (n >= target) return <Tag color="green">Đạt</Tag>
  if (n >= target - 10) return <Tag color="gold">Cần cải thiện</Tag>
  return <Tag color="red">Chưa đạt</Tag>
}

export default function CurriculumAnalyticsPage() {
  const [programs, setPrograms] = useState([])
  const [plos, setPlos] = useState([])
  const [clos, setClos] = useState([])
  const [mappings, setMappings] = useState([])
  const [coverage, setCoverage] = useState([])
  const [bloom, setBloom] = useState([])
  const [assessmentBalance, setAssessmentBalance] = useState([])
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const [{ data: programData }, { data: ploData }, { data: cloData }, { data: mappingData }, { data: coverageData }, { data: bloomData }, { data: balanceData }] = await Promise.all([
      supabase.from('programs').select('*'),
      supabase.from('oas_plos').select('*'),
      supabase.from('oas_clos').select('*'),
      supabase.from('oas_clo_plo_mapping').select('*'),
      supabase.from('curriculum_coverage').select('*'),
      supabase.from('curriculum_bloom_analysis').select('*'),
      supabase.from('curriculum_assessment_balance').select('*'),
    ])
    setPrograms(programData || [])
    setPlos(ploData || [])
    setClos(cloData || [])
    setMappings(mappingData || [])
    setCoverage(coverageData || [])
    setBloom(bloomData || [])
    setAssessmentBalance(balanceData || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const programOptions = programs.map((p) => ({ value: p.id, label: p.name || p.program_name || p.code || p.id }))

  const filteredPlo = useMemo(() => {
    let data = plos
    if (selectedProgram) data = data.filter((x) => x.program_id === selectedProgram)
    const q = keyword.toLowerCase().trim()
    if (q) data = data.filter((x) => JSON.stringify(x).toLowerCase().includes(q))
    return data
  }, [plos, selectedProgram, keyword])

  const filteredCoverage = useMemo(() => {
    let data = coverage
    if (selectedProgram) data = data.filter((x) => x.program_id === selectedProgram)
    const q = keyword.toLowerCase().trim()
    if (q) data = data.filter((x) => JSON.stringify(x).toLowerCase().includes(q))
    return data
  }, [coverage, selectedProgram, keyword])

  const filteredBloom = useMemo(() => {
    let data = bloom
    if (selectedProgram) data = data.filter((x) => x.program_id === selectedProgram)
    return data
  }, [bloom, selectedProgram])

  const stats = useMemo(() => {
    const totalPlo = filteredPlo.length
    const mappedPlo = filteredCoverage.filter((x) => Number(x.coverage_rate || 0) > 0).length
    const weakPlo = filteredCoverage.filter((x) => Number(x.coverage_rate || 0) < 60).length
    const avgCoverage = filteredCoverage.length ? filteredCoverage.reduce((s, x) => s + Number(x.coverage_rate || 0), 0) / filteredCoverage.length : 0
    return { totalPlo, mappedPlo, weakPlo, avgCoverage }
  }, [filteredPlo, filteredCoverage])

  const ploColumns = [
    { title: 'PLO/CDR', dataIndex: 'code', render: (v) => <b>{v}</b> },
    { title: 'Mô tả', dataIndex: 'description' },
    { title: 'Bloom yêu cầu', dataIndex: 'bloom_level', align: 'center' },
    { title: 'Target', dataIndex: 'target_score', align: 'center', render: (v) => `${v || 80}%` },
    { title: 'Trạng thái', render: (_, r) => statusTag(r.actual_score, r.target_score || 80) },
  ]

  const coverageColumns = [
    { title: 'PLO/CDR', dataIndex: 'plo_code', render: (v) => <b>{v}</b> },
    { title: 'Số CLO đóng góp', dataIndex: 'clo_count', align: 'center' },
    { title: 'Số học phần', dataIndex: 'course_count', align: 'center' },
    { title: 'Mức phủ', dataIndex: 'coverage_rate', render: (v) => <Progress percent={pct(v)} size="small" /> },
    { title: 'Cảnh báo', render: (_, r) => Number(r.coverage_rate || 0) < 60 ? <Tag color="red">Thiếu phủ</Tag> : <Tag color="green">Ổn</Tag> },
  ]

  const bloomColumns = [
    { title: 'PLO/CDR', dataIndex: 'plo_code', render: (v) => <b>{v}</b> },
    { title: 'Bloom yêu cầu', dataIndex: 'required_bloom', align: 'center' },
    { title: 'Bloom đạt', dataIndex: 'achieved_bloom', align: 'center' },
    { title: 'Đánh giá', render: (_, r) => Number(r.achieved_bloom || 0) >= Number(r.required_bloom || 0) ? <Tag color="green">Đạt Bloom</Tag> : <Tag color="red">Chưa đạt Bloom</Tag> },
    { title: 'Ghi chú', dataIndex: 'note' },
  ]

  const mappingColumns = [
    { title: 'CLO', dataIndex: 'clo_code', render: (v) => <b>{v}</b> },
    { title: 'PLO', dataIndex: 'plo_code' },
    { title: 'Học phần', dataIndex: 'course_code' },
    { title: 'Mức đóng góp', dataIndex: 'contribution_level', render: (v) => <Tag color={v === 'M' ? 'green' : v === 'R' ? 'blue' : 'gold'}>{v || 'I'}</Tag> },
    { title: 'Trọng số', dataIndex: 'weight', align: 'center', render: (v) => `${v || 0}%` },
  ]

  const balanceColumns = [
    { title: 'Học phần', dataIndex: 'course_code', render: (v) => <b>{v}</b> },
    { title: 'Quiz', dataIndex: 'quiz_weight', render: (v) => `${v || 0}%` },
    { title: 'Assignment', dataIndex: 'assignment_weight', render: (v) => `${v || 0}%` },
    { title: 'Presentation', dataIndex: 'presentation_weight', render: (v) => `${v || 0}%` },
    { title: 'Final', dataIndex: 'final_weight', render: (v) => `${v || 0}%` },
    { title: 'Cảnh báo', render: (_, r) => Number(r.final_weight || 0) > 70 ? <Tag color="red">Final quá cao</Tag> : <Tag color="green">Cân bằng</Tag> },
  ]

  return (
    <>
      <h1 className="page-title"><BarChartOutlined /> Curriculum Analytics</h1>
      <div className="page-subtitle">Phân tích chương trình đào tạo: mức phủ PLO, mapping CLO-PLO, Bloom, cân bằng đánh giá và cảnh báo kiểm định</div>

      <Card className="toolbar-card" style={{ marginBottom: 16 }}>
        <div className="toolbar">
          <Space wrap>
            <Select allowClear placeholder="Chọn CTĐT" style={{ width: 280 }} options={programOptions} value={selectedProgram} onChange={setSelectedProgram} />
            <Input prefix={<SearchOutlined />} placeholder="Tìm PLO, CLO, học phần..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ width: 320 }} />
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
            <Button icon={<DownloadOutlined />} onClick={() => exportCsv('curriculum-analytics.csv', filteredCoverage)}>Xuất CSV</Button>
          </Space>
        </div>
      </Card>

      <div className="stat-grid">
        <Card className="stat-card"><div className="muted">Tổng PLO</div><h2>{stats.totalPlo}</h2></Card>
        <Card className="stat-card"><div className="muted">PLO có mapping</div><h2>{stats.mappedPlo}</h2></Card>
        <Card className="stat-card"><div className="muted">PLO cần cải thiện</div><h2>{stats.weakPlo}</h2></Card>
        <Card className="stat-card"><div className="muted">Mức phủ trung bình</div><h2>{pct(stats.avgCoverage)}%</h2></Card>
      </div>

      <Tabs
        items={[
          { key: 'coverage', label: 'PLO Coverage', children: <Card><Table rowKey="id" loading={loading} columns={coverageColumns} dataSource={filteredCoverage} pagination={{ pageSize: 8 }} /></Card> },
          { key: 'plos', label: 'PLO/CDR', children: <Card><Table rowKey="id" loading={loading} columns={ploColumns} dataSource={filteredPlo} pagination={{ pageSize: 8 }} /></Card> },
          { key: 'mapping', label: 'CLO-PLO Mapping', children: <Card><Table rowKey="id" loading={loading} columns={mappingColumns} dataSource={mappings} pagination={{ pageSize: 8 }} scroll={{ x: 1000 }} /></Card> },
          { key: 'bloom', label: 'Bloom Analysis', children: <Card><Table rowKey="id" loading={loading} columns={bloomColumns} dataSource={filteredBloom} pagination={{ pageSize: 8 }} /></Card> },
          { key: 'assessment', label: 'Assessment Balance', children: <Card><Table rowKey="id" loading={loading} columns={balanceColumns} dataSource={assessmentBalance} pagination={{ pageSize: 8 }} /></Card> },
        ]}
      />
    </>
  )
}
