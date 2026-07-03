import { DeleteOutlined, DownloadOutlined, EditOutlined, FilePdfOutlined, FileWordOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'
import { Document, Packer, Paragraph, TextRun, Table as DocxTable, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from 'docx'
import { saveAs } from 'file-saver'
import html2pdf from 'html2pdf.js'

const tables = {
  profile: 'ris21_faculty_profiles',
  education: 'ris21_education_history',
  employment: 'ris21_employment_history',
  language: 'ris21_languages',
  publication: 'ris21_publications',
  pubAuthors: 'ris21_publication_authors',
  project: 'ris21_projects',
  projectMembers: 'ris21_project_members',
}

function pick(row, keys, fallback = '') {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  return fallback
}

export default function RIS21Page() {
  const [faculty, setFaculty] = useState([])
  const [profiles, setProfiles] = useState([])
  const [education, setEducation] = useState([])
  const [employment, setEmployment] = useState([])
  const [languages, setLanguages] = useState([])
  const [publications, setPublications] = useState([])
  const [pubAuthors, setPubAuthors] = useState([])
  const [projects, setProjects] = useState([])
  const [projectMembers, setProjectMembers] = useState([])
  const [selectedFacultyId, setSelectedFacultyId] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    const [f, p, e, em, l, pub, pa, pr, pm] = await Promise.all([
      supabase.from('faculty').select('*').order('full_name', { ascending: true }),
      supabase.from(tables.profile).select('*'),
      supabase.from(tables.education).select('*').order('end_year', { ascending: false }),
      supabase.from(tables.employment).select('*').order('from_year', { ascending: false }),
      supabase.from(tables.language).select('*'),
      supabase.from(tables.publication).select('*').order('publication_year', { ascending: false }),
      supabase.from(tables.pubAuthors).select('*'),
      supabase.from(tables.project).select('*').order('start_date', { ascending: false }),
      supabase.from(tables.projectMembers).select('*'),
    ])
    ;[f, p, e, em, l, pub, pa, pr, pm].forEach((x) => x.error && message.error(x.error.message))
    setFaculty(f.data || [])
    setProfiles(p.data || [])
    setEducation(e.data || [])
    setEmployment(em.data || [])
    setLanguages(l.data || [])
    setPublications(pub.data || [])
    setPubAuthors(pa.data || [])
    setProjects(pr.data || [])
    setProjectMembers(pm.data || [])
    if (!selectedFacultyId && (f.data || []).length) setSelectedFacultyId(f.data[0].id)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const currentFaculty = faculty.find((x) => x.id === selectedFacultyId)
  const currentProfile = profiles.find((x) => x.faculty_id === selectedFacultyId) || {}
  const facultyName = (id) => pick(faculty.find((x) => x.id === id), ['full_name', 'name', 'ho_ten'], id || '')

  const stats = useMemo(() => {
    const facultyPubIds = pubAuthors.filter((x) => x.faculty_id === selectedFacultyId).map((x) => x.publication_id)
    const myPubs = publications.filter((x) => facultyPubIds.includes(x.id))
    const facultyProjectIds = projectMembers.filter((x) => x.faculty_id === selectedFacultyId).map((x) => x.project_id)
    return {
      pubs: myPubs.length,
      q1q2: myPubs.filter((x) => ['Q1', 'Q2'].includes(String(x.quartile).toUpperCase())).length,
      projects: facultyProjectIds.length,
      points: myPubs.reduce((s, x) => s + Number(x.points || 0), 0),
    }
  }, [selectedFacultyId, publications, pubAuthors, projectMembers])

  const openModal = (type, record = null) => {
    setModal(type)
    setEditing(record)
    form.resetFields()
    const defaults = { faculty_id: selectedFacultyId }
    if (type === 'profile') form.setFieldsValue({ ...defaults, ...currentProfile })
    else form.setFieldsValue({ ...defaults, ...(record || {}) })
  }

  const closeModal = () => { setModal(null); setEditing(null); form.resetFields() }

  const saveGeneric = async (table, extra = {}) => {
    const values = await form.validateFields()
    const payload = { ...values, ...extra, updated_at: new Date().toISOString() }
    let result
    if (editing?.id) result = await supabase.from(table).update(payload).eq('id', editing.id)
    else result = await supabase.from(table).insert([{ ...payload, created_at: new Date().toISOString() }])
    if (result.error) return message.error(result.error.message)
    message.success('Đã lưu')
    closeModal(); load()
  }

  const saveProfile = async () => {
    const values = await form.validateFields()
    const payload = { ...values, faculty_id: selectedFacultyId, updated_at: new Date().toISOString() }
    let result
    if (currentProfile?.id) result = await supabase.from(tables.profile).update(payload).eq('id', currentProfile.id)
    else result = await supabase.from(tables.profile).insert([{ ...payload, created_at: new Date().toISOString() }])
    if (result.error) return message.error(result.error.message)
    message.success('Đã lưu hồ sơ bổ sung')
    closeModal(); load()
  }

  const remove = async (table, id) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa')
    load()
  }

  const savePublication = async () => {
    const values = await form.validateFields()
    const authorIds = values.author_ids || []
    const pubPayload = { ...values }
    delete pubPayload.author_ids
    let pubId = editing?.id
    let result
    if (editing?.id) result = await supabase.from(tables.publication).update({ ...pubPayload, updated_at: new Date().toISOString() }).eq('id', editing.id)
    else result = await supabase.from(tables.publication).insert([{ ...pubPayload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]).select('id').single()
    if (result.error) return message.error(result.error.message)
    if (!pubId) pubId = result.data.id
    await supabase.from(tables.pubAuthors).delete().eq('publication_id', pubId)
    const authorRows = authorIds.map((fid, idx) => ({ publication_id: pubId, faculty_id: fid, author_order: idx + 1, author_role: idx === 0 ? 'First author' : 'Co-author', is_corresponding: fid === values.corresponding_faculty_id }))
    if (authorRows.length) {
      const { error } = await supabase.from(tables.pubAuthors).insert(authorRows)
      if (error) return message.error(error.message)
    }
    message.success('Đã lưu công bố và danh sách tác giả')
    closeModal(); load()
  }

  const saveProject = async () => {
    const values = await form.validateFields()
    const memberIds = values.member_ids || []
    const projectPayload = { ...values }
    delete projectPayload.member_ids
    let projectId = editing?.id
    let result
    if (editing?.id) result = await supabase.from(tables.project).update({ ...projectPayload, updated_at: new Date().toISOString() }).eq('id', editing.id)
    else result = await supabase.from(tables.project).insert([{ ...projectPayload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]).select('id').single()
    if (result.error) return message.error(result.error.message)
    if (!projectId) projectId = result.data.id
    await supabase.from(tables.projectMembers).delete().eq('project_id', projectId)
    const rows = memberIds.map((fid, idx) => ({ project_id: projectId, faculty_id: fid, member_role: idx === 0 ? 'Chủ nhiệm' : 'Thành viên' }))
    if (rows.length) {
      const { error } = await supabase.from(tables.projectMembers).insert(rows)
      if (error) return message.error(error.message)
    }
    message.success('Đã lưu đề tài và thành viên')
    closeModal(); load()
  }


  const safeText = (value) => value === undefined || value === null || value === '' ? '' : String(value)

  const getLLKHData = () => {
    const publicationRows = myPublications.map((pub, index) => ({
      stt: index + 1,
      year: safeText(pub.publication_year),
      title: safeText(pub.title),
      journal: safeText(pub.journal),
      quartile: safeText(pub.quartile),
      doi: safeText(pub.doi),
      points: safeText(pub.points),
      authors: pubAuthors
        .filter((a) => a.publication_id === pub.id)
        .sort((a, b) => Number(a.author_order || 0) - Number(b.author_order || 0))
        .map((a) => facultyName(a.faculty_id))
        .join('; '),
    }))

    const projectRows = myProjects.map((project, index) => ({
      stt: index + 1,
      code: safeText(project.code),
      title: safeText(project.title),
      level: safeText(project.project_level),
      agency: safeText(project.funding_agency),
      budget: safeText(project.budget),
      status: safeText(project.status),
      members: projectMembers
        .filter((m) => m.project_id === project.id)
        .map((m) => `${facultyName(m.faculty_id)}${m.member_role ? ` (${m.member_role})` : ''}`)
        .join('; '),
    }))

    return {
      faculty: currentFaculty || {},
      profile: currentProfile || {},
      education: myEducation,
      employment: myEmployment,
      languages: myLanguages,
      publications: publicationRows,
      projects: projectRows,
      generatedDate: new Date(),
    }
  }

  const formatVNDate = (date = new Date()) => {
    const d = new Date(date)
    return `ngày ${String(d.getDate()).padStart(2, '0')} tháng ${String(d.getMonth() + 1).padStart(2, '0')} năm ${d.getFullYear()}`
  }

  const buildLLKHHtml = (data) => {
    const fullName = safeText(pick(data.faculty, ['full_name', 'name', 'ho_ten'], ''))
    const row = (label, value) => `<tr><td class="label">${label}</td><td>${safeText(value) || '&nbsp;'}</td></tr>`
    const listRows = (items, columns) => {
      if (!items.length) return `<tr><td colspan="${columns.length}">Chưa có dữ liệu</td></tr>`
      return items.map((item, index) => `<tr>${columns.map((col) => `<td>${col.value(item, index) || '&nbsp;'}</td>`).join('')}</tr>`).join('')
    }

    return `
      <div class="llkh-doc">
        <style>
          .llkh-doc{font-family:'Times New Roman',serif;color:#111;font-size:13px;line-height:1.35;padding:24px;background:#fff}
          .llkh-doc h1{text-align:center;font-size:18px;margin:4px 0 12px;text-transform:uppercase}
          .llkh-doc h2{font-size:14px;margin:14px 0 6px;text-transform:uppercase;border-bottom:1px solid #333;padding-bottom:3px}
          .llkh-doc .top{text-align:center;font-weight:bold;line-height:1.4}
          .llkh-doc table{width:100%;border-collapse:collapse;margin:6px 0 10px}
          .llkh-doc td,.llkh-doc th{border:1px solid #333;padding:5px;vertical-align:top}
          .llkh-doc th{background:#f0f0f0;text-align:center;font-weight:bold}
          .llkh-doc .label{width:210px;font-weight:bold;background:#fafafa}
          .llkh-doc .signature{margin-top:32px;display:flex;justify-content:flex-end;text-align:center}
          .llkh-doc .signature-block{width:260px}
          .llkh-doc .signature-space{height:72px}
        </style>
        <div class="top">HỌC VIỆN HÀNG KHÔNG VIỆT NAM<br/>VIỆN ĐÀO TẠO SAU ĐẠI HỌC</div>
        <h1>LÝ LỊCH KHOA HỌC</h1>

        <h2>I. Thông tin nhân sự</h2>
        <table>
          ${row('Họ và tên', fullName)}
          ${row('Email', pick(data.faculty, ['email'], ''))}
          ${row('Điện thoại', pick(data.faculty, ['phone'], ''))}
          ${row('Học hàm', pick(data.faculty, ['academic_rank'], ''))}
          ${row('Học vị', pick(data.faculty, ['degree'], ''))}
          ${row('Đơn vị', pick(data.faculty, ['department', 'unit'], ''))}
          ${row('Ngày sinh', data.profile.birth_date)}
          ${row('Nơi sinh', data.profile.birthplace)}
          ${row('Quê quán', data.profile.hometown)}
          ${row('Chuyên ngành', data.profile.specialization)}
          ${row('ORCID', pick(data.faculty, ['orcid'], data.profile.orcid))}
          ${row('Scopus ID', pick(data.faculty, ['scopus_id'], data.profile.scopus_id))}
          ${row('Google Scholar', pick(data.faculty, ['google_scholar'], data.profile.google_scholar))}
          ${row('H-index', data.profile.h_index)}
          ${row('Hướng nghiên cứu', data.profile.research_interests)}
          ${row('Tiểu sử khoa học', data.profile.research_summary)}
        </table>

        <h2>II. Quá trình đào tạo</h2>
        <table><thead><tr><th>STT</th><th>Bậc</th><th>Trường</th><th>Quốc gia</th><th>Ngành</th><th>Chuyên ngành</th><th>Từ năm</th><th>Đến năm</th></tr></thead><tbody>
          ${listRows(data.education, [
            { value: (_, i) => i + 1 },
            { value: (x) => x.degree_level },
            { value: (x) => x.institution },
            { value: (x) => x.country },
            { value: (x) => x.major },
            { value: (x) => x.specialization },
            { value: (x) => x.start_year },
            { value: (x) => x.end_year },
          ])}
        </tbody></table>

        <h2>III. Quá trình công tác</h2>
        <table><thead><tr><th>STT</th><th>Từ năm</th><th>Đến năm</th><th>Đơn vị</th><th>Bộ môn</th><th>Chức vụ</th></tr></thead><tbody>
          ${listRows(data.employment, [
            { value: (_, i) => i + 1 },
            { value: (x) => x.from_year },
            { value: (x) => x.to_year },
            { value: (x) => x.organization },
            { value: (x) => x.department },
            { value: (x) => x.position },
          ])}
        </tbody></table>

        <h2>IV. Ngoại ngữ</h2>
        <table><thead><tr><th>STT</th><th>Ngoại ngữ</th><th>Nghe</th><th>Nói</th><th>Đọc</th><th>Viết</th><th>Chứng chỉ</th></tr></thead><tbody>
          ${listRows(data.languages, [
            { value: (_, i) => i + 1 },
            { value: (x) => x.language },
            { value: (x) => x.listening },
            { value: (x) => x.speaking },
            { value: (x) => x.reading },
            { value: (x) => x.writing },
            { value: (x) => x.certificate },
          ])}
        </tbody></table>

        <h2>V. Công bố khoa học</h2>
        <table><thead><tr><th>STT</th><th>Năm</th><th>Tên công bố</th><th>Tạp chí/NXB</th><th>Tác giả</th><th>Q</th><th>DOI</th><th>Điểm</th></tr></thead><tbody>
          ${listRows(data.publications, [
            { value: (x) => x.stt },
            { value: (x) => x.year },
            { value: (x) => x.title },
            { value: (x) => x.journal },
            { value: (x) => x.authors },
            { value: (x) => x.quartile },
            { value: (x) => x.doi },
            { value: (x) => x.points },
          ])}
        </tbody></table>

        <h2>VI. Đề tài nghiên cứu</h2>
        <table><thead><tr><th>STT</th><th>Mã</th><th>Tên đề tài</th><th>Cấp</th><th>Cơ quan tài trợ</th><th>Kinh phí</th><th>Thành viên</th><th>Trạng thái</th></tr></thead><tbody>
          ${listRows(data.projects, [
            { value: (x) => x.stt },
            { value: (x) => x.code },
            { value: (x) => x.title },
            { value: (x) => x.level },
            { value: (x) => x.agency },
            { value: (x) => x.budget },
            { value: (x) => x.members },
            { value: (x) => x.status },
          ])}
        </tbody></table>

        <div class="signature">
          <div class="signature-block">
            <div>TP. Hồ Chí Minh, ${formatVNDate(data.generatedDate)}</div>
            <div><b>NGƯỜI KHAI</b></div>
            <div><i>Ký và ghi rõ họ tên</i></div>
            <div class="signature-space"></div>
            <div><b>${fullName}</b></div>
          </div>
        </div>
      </div>`
  }

  const makeCell = (text, opts = {}) => new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text: safeText(text), bold: !!opts.bold })] })],
  })

  const makeTable = (headers, rows) => new DocxTable({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: headers.map((h) => makeCell(h, { bold: true })) }),
      ...(rows.length ? rows : [['Chưa có dữ liệu']]).map((r) => new TableRow({ children: (Array.isArray(r) ? r : [r]).map((c) => makeCell(c)) })),
    ],
  })

  const exportLLKHWord = async () => {
    if (!currentFaculty?.id) return message.warning('Vui lòng chọn giảng viên')
    const data = getLLKHData()
    const fullName = safeText(pick(data.faculty, ['full_name', 'name', 'ho_ten'], 'giang-vien'))

    const children = [
      new Paragraph({ text: 'HỌC VIỆN HÀNG KHÔNG VIỆT NAM', alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: 'VIỆN ĐÀO TẠO SAU ĐẠI HỌC', alignment: AlignmentType.CENTER }),
      new Paragraph({ text: 'LÝ LỊCH KHOA HỌC', alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: 'I. Thông tin nhân sự', heading: HeadingLevel.HEADING_2 }),
      makeTable(['Nội dung', 'Thông tin'], [
        ['Họ và tên', fullName],
        ['Email', pick(data.faculty, ['email'], '')],
        ['Điện thoại', pick(data.faculty, ['phone'], '')],
        ['Học hàm', pick(data.faculty, ['academic_rank'], '')],
        ['Học vị', pick(data.faculty, ['degree'], '')],
        ['Ngày sinh', data.profile.birth_date],
        ['Nơi sinh', data.profile.birthplace],
        ['Quê quán', data.profile.hometown],
        ['Chuyên ngành', data.profile.specialization],
        ['ORCID', pick(data.faculty, ['orcid'], data.profile.orcid)],
        ['Scopus ID', pick(data.faculty, ['scopus_id'], data.profile.scopus_id)],
        ['Google Scholar', pick(data.faculty, ['google_scholar'], data.profile.google_scholar)],
        ['Hướng nghiên cứu', data.profile.research_interests],
      ]),
      new Paragraph({ text: 'II. Quá trình đào tạo', heading: HeadingLevel.HEADING_2 }),
      makeTable(['STT', 'Bậc', 'Trường', 'Quốc gia', 'Ngành', 'Từ', 'Đến'], data.education.map((x, i) => [i + 1, x.degree_level, x.institution, x.country, x.major, x.start_year, x.end_year])),
      new Paragraph({ text: 'III. Quá trình công tác', heading: HeadingLevel.HEADING_2 }),
      makeTable(['STT', 'Từ', 'Đến', 'Đơn vị', 'Bộ môn', 'Chức vụ'], data.employment.map((x, i) => [i + 1, x.from_year, x.to_year, x.organization, x.department, x.position])),
      new Paragraph({ text: 'IV. Ngoại ngữ', heading: HeadingLevel.HEADING_2 }),
      makeTable(['STT', 'Ngoại ngữ', 'Nghe', 'Nói', 'Đọc', 'Viết', 'Chứng chỉ'], data.languages.map((x, i) => [i + 1, x.language, x.listening, x.speaking, x.reading, x.writing, x.certificate])),
      new Paragraph({ text: 'V. Công bố khoa học', heading: HeadingLevel.HEADING_2 }),
      makeTable(['STT', 'Năm', 'Tên công bố', 'Tạp chí/NXB', 'Tác giả', 'Q', 'DOI'], data.publications.map((x) => [x.stt, x.year, x.title, x.journal, x.authors, x.quartile, x.doi])),
      new Paragraph({ text: 'VI. Đề tài nghiên cứu', heading: HeadingLevel.HEADING_2 }),
      makeTable(['STT', 'Mã', 'Tên đề tài', 'Cấp', 'Thành viên', 'Trạng thái'], data.projects.map((x) => [x.stt, x.code, x.title, x.level, x.members, x.status])),
      new Paragraph({ text: `TP. Hồ Chí Minh, ${formatVNDate(data.generatedDate)}`, alignment: AlignmentType.RIGHT }),
      new Paragraph({ text: 'NGƯỜI KHAI', alignment: AlignmentType.RIGHT }),
      new Paragraph({ text: 'Ký và ghi rõ họ tên', alignment: AlignmentType.RIGHT }),
      new Paragraph({ text: '', spacing: { after: 1200 } }),
      new Paragraph({ text: fullName, alignment: AlignmentType.RIGHT }),
    ]

    const doc = new Document({ sections: [{ children }] })
    const blob = await Packer.toBlob(doc)
    saveAs(blob, `LLKH_${fullName.replace(/\s+/g, '_')}.docx`)
  }

  const exportLLKHPdf = () => {
    if (!currentFaculty?.id) return message.warning('Vui lòng chọn giảng viên')
    const data = getLLKHData()
    const fullName = safeText(pick(data.faculty, ['full_name', 'name', 'ho_ten'], 'giang-vien'))
    const wrapper = document.createElement('div')
    wrapper.innerHTML = buildLLKHHtml(data)
    html2pdf()
      .set({
        margin: 8,
        filename: `LLKH_${fullName.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      })
      .from(wrapper)
      .save()
  }

  const myEducation = education.filter((x) => x.faculty_id === selectedFacultyId)
  const myEmployment = employment.filter((x) => x.faculty_id === selectedFacultyId)
  const myLanguages = languages.filter((x) => x.faculty_id === selectedFacultyId)
  const myPubIds = pubAuthors.filter((x) => x.faculty_id === selectedFacultyId).map((x) => x.publication_id)
  const myPublications = publications.filter((x) => myPubIds.includes(x.id))
  const myProjectIds = projectMembers.filter((x) => x.faculty_id === selectedFacultyId).map((x) => x.project_id)
  const myProjects = projects.filter((x) => myProjectIds.includes(x.id))

  const facultyOptions = faculty.map((f) => ({ value: f.id, label: facultyName(f.id) }))

  return <>
    <h1 className="page-title">RIS 2.1 – Hồ sơ khoa học tích hợp</h1>
    <div className="page-subtitle">Dữ liệu nhân sự lấy từ Module Giảng viên; phần còn thiếu bổ sung tại RIS; công bố/đề tài nhập một lần dùng cho nhiều giảng viên.</div>

    <Card className="toolbar-card" style={{ marginBottom: 16 }}>
      <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
        <Select style={{ minWidth: 360 }} showSearch optionFilterProp="label" value={selectedFacultyId} onChange={setSelectedFacultyId} options={facultyOptions} placeholder="Chọn giảng viên" />
        <Space>
          <Input prefix={<SearchOutlined />} placeholder="Tìm kiếm..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ width: 280 }} />
          <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
          <Button icon={<FileWordOutlined />} onClick={exportLLKHWord}>Xuất Word LLKH</Button>
          <Button icon={<FilePdfOutlined />} onClick={exportLLKHPdf}>Xuất PDF LLKH</Button>
        </Space>
      </Space>
    </Card>

    <div className="stat-grid">
      <Card className="stat-card"><div className="muted">Công bố</div><h2>{stats.pubs}</h2></Card>
      <Card className="stat-card"><div className="muted">Q1/Q2</div><h2>{stats.q1q2}</h2></Card>
      <Card className="stat-card"><div className="muted">Đề tài</div><h2>{stats.projects}</h2></Card>
      <Card className="stat-card"><div className="muted">Điểm NCKH</div><h2>{stats.points}</h2></Card>
    </div>

    <Tabs items={[
      { key: 'profile', label: 'Thông tin nhân sự', children: <Card><Space direction="vertical" size="small" style={{ width: '100%' }}>
        <b>{pick(currentFaculty, ['full_name', 'name'], 'Chưa chọn giảng viên')}</b>
        <div>Email: {pick(currentFaculty, ['email'], '')}</div>
        <div>Điện thoại: {pick(currentFaculty, ['phone'], '')}</div>
        <div>Học hàm: {pick(currentFaculty, ['academic_rank'], '')} | Học vị: {pick(currentFaculty, ['degree'], '')}</div>
        <div>ORCID: {pick(currentFaculty, ['orcid'], currentProfile.orcid || '')}</div>
        <div>Scopus ID: {pick(currentFaculty, ['scopus_id'], currentProfile.scopus_id || '')}</div>
        <div>Google Scholar: {pick(currentFaculty, ['google_scholar'], currentProfile.google_scholar || '')}</div>
        <div>Chuyên ngành bổ sung: {currentProfile.specialization || <span className="muted">Chưa có</span>}</div>
        <div>Hướng nghiên cứu: {currentProfile.research_interests || <span className="muted">Chưa có</span>}</div>
        <Button type="primary" onClick={() => openModal('profile')}>Bổ sung / cập nhật hồ sơ</Button>
      </Space></Card> },
      { key: 'edu', label: 'Quá trình đào tạo', children: <HistoryTable loading={loading} data={myEducation} columns={[
        { title: 'Bậc', dataIndex: 'degree_level' }, { title: 'Trường', dataIndex: 'institution' }, { title: 'Quốc gia', dataIndex: 'country' }, { title: 'Ngành', dataIndex: 'major' }, { title: 'Từ', dataIndex: 'start_year' }, { title: 'Đến', dataIndex: 'end_year' }, { title: 'Thao tác', render: (_, r) => <Actions onEdit={() => openModal('education', r)} onDelete={() => remove(tables.education, r.id)} /> }
      ]} onAdd={() => openModal('education')} onExport={() => exportCsv('qua-trinh-dao-tao.csv', myEducation)} /> },
      { key: 'emp', label: 'Quá trình công tác', children: <HistoryTable loading={loading} data={myEmployment} columns={[
        { title: 'Từ', dataIndex: 'from_year' }, { title: 'Đến', dataIndex: 'to_year' }, { title: 'Đơn vị', dataIndex: 'organization' }, { title: 'Bộ môn', dataIndex: 'department' }, { title: 'Chức vụ', dataIndex: 'position' }, { title: 'Thao tác', render: (_, r) => <Actions onEdit={() => openModal('employment', r)} onDelete={() => remove(tables.employment, r.id)} /> }
      ]} onAdd={() => openModal('employment')} onExport={() => exportCsv('qua-trinh-cong-tac.csv', myEmployment)} /> },
      { key: 'lang', label: 'Ngoại ngữ', children: <HistoryTable loading={loading} data={myLanguages} columns={[
        { title: 'Ngoại ngữ', dataIndex: 'language' }, { title: 'Nghe', dataIndex: 'listening' }, { title: 'Nói', dataIndex: 'speaking' }, { title: 'Đọc', dataIndex: 'reading' }, { title: 'Viết', dataIndex: 'writing' }, { title: 'Chứng chỉ', dataIndex: 'certificate' }, { title: 'Thao tác', render: (_, r) => <Actions onEdit={() => openModal('language', r)} onDelete={() => remove(tables.language, r.id)} /> }
      ]} onAdd={() => openModal('language')} onExport={() => exportCsv('ngoai-ngu.csv', myLanguages)} /> },
      { key: 'pub', label: 'Công bố khoa học', children: <HistoryTable loading={loading} data={myPublications} columns={[
        { title: 'Năm', dataIndex: 'publication_year' }, { title: 'Tên công bố', dataIndex: 'title' }, { title: 'Tạp chí', dataIndex: 'journal' }, { title: 'Q', dataIndex: 'quartile', render: v => v ? <Tag color={['Q1','Q2'].includes(String(v).toUpperCase()) ? 'green' : 'default'}>{v}</Tag> : '' }, { title: 'DOI', dataIndex: 'doi' }, { title: 'Điểm', dataIndex: 'points' }, { title: 'Tác giả', render: (_, r) => pubAuthors.filter(a => a.publication_id === r.id).sort((a,b)=>a.author_order-b.author_order).map(a=>facultyName(a.faculty_id)).join('; ') }, { title: 'Thao tác', render: (_, r) => <Actions onEdit={() => openModal('publication', r)} onDelete={() => remove(tables.publication, r.id)} /> }
      ]} onAdd={() => openModal('publication')} onExport={() => exportCsv('cong-bo-khoa-hoc.csv', myPublications)} /> },
      { key: 'project', label: 'Đề tài', children: <HistoryTable loading={loading} data={myProjects} columns={[
        { title: 'Mã', dataIndex: 'code' }, { title: 'Tên đề tài', dataIndex: 'title' }, { title: 'Cấp', dataIndex: 'project_level' }, { title: 'Kinh phí', dataIndex: 'budget' }, { title: 'Trạng thái', dataIndex: 'status' }, { title: 'Thành viên', render: (_, r) => projectMembers.filter(m => m.project_id === r.id).map(m=>facultyName(m.faculty_id)).join('; ') }, { title: 'Thao tác', render: (_, r) => <Actions onEdit={() => openModal('project', r)} onDelete={() => remove(tables.project, r.id)} /> }
      ]} onAdd={() => openModal('project')} onExport={() => exportCsv('de-tai.csv', myProjects)} /> },
    ]} />

    <Modal title="Bổ sung hồ sơ nhân sự" open={modal === 'profile'} onCancel={closeModal} onOk={saveProfile} okText="Lưu" cancelText="Hủy" width={850}>
      <Form form={form} layout="vertical"><div className="form-grid">
        <Form.Item name="birth_date" label="Ngày sinh"><Input placeholder="YYYY-MM-DD" /></Form.Item>
        <Form.Item name="birthplace" label="Nơi sinh"><Input /></Form.Item>
        <Form.Item name="hometown" label="Quê quán"><Input /></Form.Item>
        <Form.Item name="specialization" label="Chuyên ngành"><Input /></Form.Item>
        <Form.Item name="orcid" label="ORCID"><Input /></Form.Item>
        <Form.Item name="scopus_id" label="Scopus ID"><Input /></Form.Item>
        <Form.Item name="google_scholar" label="Google Scholar"><Input /></Form.Item>
        <Form.Item name="h_index" label="H-index"><InputNumber min={0} style={{ width:'100%' }} /></Form.Item>
        <Form.Item name="research_interests" label="Hướng nghiên cứu" className="full"><Input.TextArea rows={3} /></Form.Item>
        <Form.Item name="research_summary" label="Tiểu sử khoa học" className="full"><Input.TextArea rows={4} /></Form.Item>
      </div></Form>
    </Modal>

    <Modal title="Quá trình đào tạo" open={modal === 'education'} onCancel={closeModal} onOk={() => saveGeneric(tables.education, { faculty_id: selectedFacultyId })} okText="Lưu" cancelText="Hủy" width={850}>
      <Form form={form} layout="vertical"><div className="form-grid">
        <Form.Item name="degree_level" label="Bậc"><Select options={[{value:'Đại học'}, {value:'Thạc sĩ'}, {value:'Tiến sĩ'}, {value:'Sau tiến sĩ'}, {value:'Khác'}]} /></Form.Item>
        <Form.Item name="institution" label="Trường"><Input /></Form.Item>
        <Form.Item name="country" label="Quốc gia"><Input /></Form.Item>
        <Form.Item name="major" label="Ngành"><Input /></Form.Item>
        <Form.Item name="specialization" label="Chuyên ngành"><Input /></Form.Item>
        <Form.Item name="start_year" label="Từ năm"><InputNumber style={{ width:'100%' }} /></Form.Item>
        <Form.Item name="end_year" label="Đến năm"><InputNumber style={{ width:'100%' }} /></Form.Item>
        <Form.Item name="thesis_title" label="Tên luận án/luận văn" className="full"><Input /></Form.Item>
      </div></Form>
    </Modal>

    <Modal title="Quá trình công tác" open={modal === 'employment'} onCancel={closeModal} onOk={() => saveGeneric(tables.employment, { faculty_id: selectedFacultyId })} okText="Lưu" cancelText="Hủy" width={850}>
      <Form form={form} layout="vertical"><div className="form-grid">
        <Form.Item name="from_year" label="Từ năm"><InputNumber style={{ width:'100%' }} /></Form.Item>
        <Form.Item name="to_year" label="Đến năm"><InputNumber style={{ width:'100%' }} /></Form.Item>
        <Form.Item name="organization" label="Đơn vị"><Input /></Form.Item>
        <Form.Item name="department" label="Bộ môn"><Input /></Form.Item>
        <Form.Item name="position" label="Chức vụ"><Input /></Form.Item>
        <Form.Item name="role_description" label="Mô tả" className="full"><Input.TextArea rows={3} /></Form.Item>
      </div></Form>
    </Modal>

    <Modal title="Ngoại ngữ" open={modal === 'language'} onCancel={closeModal} onOk={() => saveGeneric(tables.language, { faculty_id: selectedFacultyId })} okText="Lưu" cancelText="Hủy" width={850}>
      <Form form={form} layout="vertical"><div className="form-grid">
        <Form.Item name="language" label="Ngoại ngữ"><Input /></Form.Item>
        <Form.Item name="listening" label="Nghe"><Input /></Form.Item>
        <Form.Item name="speaking" label="Nói"><Input /></Form.Item>
        <Form.Item name="reading" label="Đọc"><Input /></Form.Item>
        <Form.Item name="writing" label="Viết"><Input /></Form.Item>
        <Form.Item name="certificate" label="Chứng chỉ"><Input /></Form.Item>
      </div></Form>
    </Modal>

    <Modal title="Công bố khoa học" open={modal === 'publication'} onCancel={closeModal} onOk={savePublication} okText="Lưu" cancelText="Hủy" width={900}>
      <Form form={form} layout="vertical"><div className="form-grid">
        <Form.Item name="title" label="Tên công bố" className="full" rules={[{ required:true, message:'Nhập tên công bố' }]}><Input /></Form.Item>
        <Form.Item name="publication_type" label="Loại"><Select options={[{value:'Journal Article'}, {value:'Book'}, {value:'Book Chapter'}, {value:'Conference'}, {value:'Domestic Journal'}]} /></Form.Item>
        <Form.Item name="publication_year" label="Năm"><InputNumber style={{ width:'100%' }} /></Form.Item>
        <Form.Item name="journal" label="Tên Tạp chí/Sách/Hội thảo" className="full"><Input /></Form.Item>
        <Form.Item name="quartile" label="Q/IF/CiteScore"><Select allowClear options={[{value:'SCI/SCIE/SSCI IF ≥ 3 hoặc A&HCI'}, {value:'SCI/SCIE/SSCI IF < 3 hoặc Scopus Q1'}, {value:'ESCI hoặc Scopus Q2,Q3,Q4'}, {value:'ACI'}, {value:'Tạp chí quốc tế khác có ISSN/phản biện'}, {value:'Khác'}]} /></Form.Item>
        <Form.Item name="doi" label="DOI"><Input /></Form.Item>
        <Form.Item name="points" label="Điểm"><InputNumber min={0} step={0.25} style={{ width:'100%' }} /></Form.Item>
        <Form.Item name="author_ids" label="Tác giả" className="full" rules={[{ required:true, message:'Chọn ít nhất một tác giả' }]}><Select mode="multiple" options={facultyOptions} /></Form.Item>
      </div></Form>
    </Modal>

    <Modal title="Đề tài" open={modal === 'project'} onCancel={closeModal} onOk={saveProject} okText="Lưu" cancelText="Hủy" width={900}>
      <Form form={form} layout="vertical"><div className="form-grid">
        <Form.Item name="code" label="Mã đề tài"><Input /></Form.Item>
        <Form.Item name="project_level" label="Cấp"><Input /></Form.Item>
        <Form.Item name="title" label="Tên đề tài" className="full" rules={[{ required:true, message:'Nhập tên đề tài' }]}><Input /></Form.Item>
        <Form.Item name="funding_agency" label="Cơ quan tài trợ"><Input /></Form.Item>
        <Form.Item name="budget" label="Kinh phí"><InputNumber min={0} style={{ width:'100%' }} /></Form.Item>
        <Form.Item name="status" label="Trạng thái"><Select options={[{value:'ongoing', label:'Đang thực hiện'}, {value:'completed', label:'Đã nghiệm thu'}, {value:'cancelled', label:'Hủy'}]} /></Form.Item>
        <Form.Item name="member_ids" label="Thành viên" className="full" rules={[{ required:true, message:'Chọn thành viên' }]}><Select mode="multiple" options={facultyOptions} /></Form.Item>
      </div></Form>
    </Modal>
  </>
}

function Actions({ onEdit, onDelete }) {
  return <Space><Button icon={<EditOutlined />} onClick={onEdit}>Sửa</Button><Popconfirm title="Xóa dòng này?" onConfirm={onDelete}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space>
}

function HistoryTable({ loading, data, columns, onAdd, onExport }) {
  return <>
    <Card className="toolbar-card" style={{ marginBottom: 16 }}><Space><Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>Thêm</Button><Button icon={<DownloadOutlined />} onClick={onExport}>Xuất CSV</Button></Space></Card>
    <Card className="table-card"><Table rowKey="id" loading={loading} columns={columns} dataSource={data} scroll={{ x: 1100 }} pagination={{ pageSize: 8 }} /></Card>
  </>
}
