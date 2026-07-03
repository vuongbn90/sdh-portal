import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx'
import { saveAs } from 'file-saver'

const text = (value) => String(value || '')

function cell(value, bold = false) {
  return new TableCell({
    width: { size: 25, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ children: [new TextRun({ text: text(value), bold })] })],
  })
}

function heading(title) {
  return new Paragraph({
    text: title,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
  })
}

function normal(label, value) {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new TextRun(text(value)),
    ],
    spacing: { after: 80 },
  })
}

function table(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: headers.map((h) => cell(h, true)) }),
      ...(rows.length ? rows : [['', '', '', '']]).map((r) => new TableRow({ children: r.map((v) => cell(v)) })),
    ],
  })
}

export async function exportLLKHDocx(data) {
  const faculty = data.faculty || {}
  const profile = data.profile || {}
  const fileName = `LLKH_${(faculty.full_name || faculty.name || 'giang_vien').replaceAll(' ', '_')}.docx`

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'LÝ LỊCH KHOA HỌC', bold: true, size: 32 })],
            spacing: { after: 240 },
          }),

          heading('I. Thông tin chung'),
          normal('Họ và tên', faculty.full_name || faculty.name),
          normal('Học hàm', faculty.academic_rank || profile.academic_title),
          normal('Học vị', faculty.degree || profile.degree),
          normal('Đơn vị công tác', faculty.department || faculty.unit || profile.unit),
          normal('Email', faculty.email),
          normal('Điện thoại', faculty.phone),
          normal('ORCID', faculty.orcid || profile.orcid),
          normal('Scopus ID', faculty.scopus_id || profile.scopus_author_id),
          normal('Google Scholar', faculty.google_scholar || profile.google_scholar),
          normal('Hướng nghiên cứu', profile.research_interests || profile.research_fields),

          heading('II. Quá trình đào tạo'),
          table(['Bậc', 'Trường', 'Quốc gia', 'Ngành/Chuyên ngành'], (data.education || []).map((x) => [x.degree_level || x.level, x.institution || x.school, x.country, x.major || x.specialization])),

          heading('III. Quá trình công tác'),
          table(['Từ năm', 'Đến năm', 'Đơn vị', 'Chức vụ'], (data.employment || []).map((x) => [x.from_year || x.start_year, x.to_year || x.end_year, x.organization || x.unit, x.position])),

          heading('IV. Ngoại ngữ'),
          table(['Ngoại ngữ', 'Nghe', 'Nói', 'Đọc/Viết'], (data.languages || []).map((x) => [x.language, x.listening || x.level, x.speaking || x.certificate, `${x.reading || ''} ${x.writing || ''}`])),

          heading('V. Công bố khoa học'),
          table(['Năm', 'Tên công bố', 'Tạp chí/NXB', 'Q/Điểm'], (data.publications || []).map((x) => [x.year || x.publication_year, x.title, x.journal || x.publisher, `${x.quartile || ''} ${x.points || ''}`])),

          heading('VI. Đề tài nghiên cứu'),
          table(['Tên đề tài', 'Cấp', 'Vai trò', 'Thời gian'], (data.projects || []).map((x) => [x.title || x.project_name, x.level || x.project_level, x.role, `${x.start_year || ''}-${x.end_year || ''}`])),

          heading('VII. Hướng dẫn, hội đồng, giảng dạy'),
          normal('Số học viên/NCS hướng dẫn', data.supervisionCount || 0),
          normal('Số hội đồng tham gia', data.councilCount || 0),
          normal('Số giờ giảng dạy', data.teachingHours || 0),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, fileName)
}
