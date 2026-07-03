import { saveAs } from 'file-saver'
import html2pdf from 'html2pdf.js'
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, AlignmentType } from 'docx'

const safe = (v) => v ?? ''

function cell(text, bold = false) {
  return new TableCell({
    width: { size: 20, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ children: [new TextRun({ text: String(safe(text)), bold })] })],
  })
}

function makeTable(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: headers.map((h) => cell(h, true)) }),
      ...(rows?.length ? rows : [[]]).map((r) => new TableRow({ children: headers.map((_, i) => cell(r[i] || '')) })),
    ],
  })
}

export async function exportLLKHDocx(data) {
  const f = data.faculty || {}
  const profile = data.profile || {}

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'LÝ LỊCH KHOA HỌC', bold: true, size: 32 })] }),
        new Paragraph({ text: '' }),
        new Paragraph({ children: [new TextRun({ text: 'I. THÔNG TIN NHÂN SỰ', bold: true })] }),
        makeTable(['Thông tin', 'Nội dung'], [
          ['Họ và tên', safe(f.full_name || f.name)],
          ['Học hàm', safe(f.academic_rank || profile.academic_rank)],
          ['Học vị', safe(f.degree || profile.degree)],
          ['Email', safe(f.email)],
          ['Điện thoại', safe(f.phone)],
          ['Đơn vị', safe(f.department)],
          ['Chuyên môn', safe(f.specialization || profile.specialization)],
          ['ORCID', safe(f.orcid || profile.orcid)],
          ['Scopus ID', safe(f.scopus_id || profile.scopus_id)],
          ['Google Scholar', safe(f.google_scholar || profile.google_scholar)],
        ]),
        new Paragraph({ text: '' }),
        new Paragraph({ children: [new TextRun({ text: 'II. QUÁ TRÌNH ĐÀO TẠO', bold: true })] }),
        makeTable(['Bậc', 'Trường', 'Quốc gia', 'Ngành', 'Năm'], (data.education || []).map(x => [x.level, x.institution, x.country, x.major, x.diploma_year || x.to_year])),
        new Paragraph({ text: '' }),
        new Paragraph({ children: [new TextRun({ text: 'III. QUÁ TRÌNH CÔNG TÁC', bold: true })] }),
        makeTable(['Từ năm', 'Đến năm', 'Đơn vị', 'Chức vụ'], (data.employment || []).map(x => [x.from_year, x.to_year, x.organization, x.position])),
        new Paragraph({ text: '' }),
        new Paragraph({ children: [new TextRun({ text: 'IV. NGOẠI NGỮ', bold: true })] }),
        makeTable(['Ngoại ngữ', 'Nghe', 'Nói', 'Đọc', 'Viết', 'Chứng chỉ'], (data.languages || []).map(x => [x.language, x.listening, x.speaking, x.reading, x.writing, x.certificate])),
        new Paragraph({ text: '' }),
        new Paragraph({ children: [new TextRun({ text: 'V. CÔNG BỐ KHOA HỌC', bold: true })] }),
        makeTable(['Năm', 'Tên công bố', 'Tạp chí/NXB', 'Q', 'DOI', 'Vai trò'], (data.publications || []).map(x => [x.year, x.title, x.journal, x.quartile, x.doi, x.author_role || x.role])),
        new Paragraph({ text: '' }),
        new Paragraph({ children: [new TextRun({ text: 'VI. ĐỀ TÀI NGHIÊN CỨU', bold: true })] }),
        makeTable(['Mã', 'Tên đề tài', 'Cấp', 'Năm', 'Vai trò'], (data.projects || []).map(x => [x.project_code, x.title, x.project_level, [x.start_year, x.end_year].filter(Boolean).join('-'), x.member_role || x.role])),
        new Paragraph({ text: '' }),
        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'TP. Hồ Chí Minh, ngày ..... tháng ..... năm .....' })] }),
        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'NGƯỜI KHAI', bold: true })] }),
        new Paragraph({ text: '' }),
        new Paragraph({ text: '' }),
        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: safe(f.full_name || f.name), bold: true })] }),
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `LLKH_${safe(f.full_name || f.name || 'giang_vien')}.docx`)
}

export function buildLLKHHtml(data) {
  const f = data.faculty || {}
  const profile = data.profile || {}
  const table = (headers, rows) => `
    <table>
      <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${(rows.length ? rows : [['']]).map(r => `<tr>${headers.map((_,i)=>`<td>${safe(r[i])}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`

  return `
  <div class="llkh-doc">
    <h1>LÝ LỊCH KHOA HỌC</h1>
    <h2>I. THÔNG TIN NHÂN SỰ</h2>
    ${table(['Thông tin','Nội dung'], [
      ['Họ và tên', safe(f.full_name || f.name)],
      ['Học hàm', safe(f.academic_rank || profile.academic_rank)],
      ['Học vị', safe(f.degree || profile.degree)],
      ['Email', safe(f.email)],
      ['Điện thoại', safe(f.phone)],
      ['Đơn vị', safe(f.department)],
      ['Chuyên môn', safe(f.specialization || profile.specialization)],
      ['ORCID', safe(f.orcid || profile.orcid)],
      ['Scopus ID', safe(f.scopus_id || profile.scopus_id)],
      ['Google Scholar', safe(f.google_scholar || profile.google_scholar)],
    ])}
    <h2>II. QUÁ TRÌNH ĐÀO TẠO</h2>
    ${table(['Bậc','Trường','Quốc gia','Ngành','Năm'], (data.education || []).map(x => [x.level, x.institution, x.country, x.major, x.diploma_year || x.to_year]))}
    <h2>III. QUÁ TRÌNH CÔNG TÁC</h2>
    ${table(['Từ năm','Đến năm','Đơn vị','Chức vụ'], (data.employment || []).map(x => [x.from_year, x.to_year, x.organization, x.position]))}
    <h2>IV. NGOẠI NGỮ</h2>
    ${table(['Ngoại ngữ','Nghe','Nói','Đọc','Viết','Chứng chỉ'], (data.languages || []).map(x => [x.language, x.listening, x.speaking, x.reading, x.writing, x.certificate]))}
    <h2>V. CÔNG BỐ KHOA HỌC</h2>
    ${table(['Năm','Tên công bố','Tạp chí/NXB','Q','DOI','Vai trò'], (data.publications || []).map(x => [x.year, x.title, x.journal, x.quartile, x.doi, x.author_role || x.role]))}
    <h2>VI. ĐỀ TÀI NGHIÊN CỨU</h2>
    ${table(['Mã','Tên đề tài','Cấp','Năm','Vai trò'], (data.projects || []).map(x => [x.project_code, x.title, x.project_level, [x.start_year, x.end_year].filter(Boolean).join('-'), x.member_role || x.role]))}
    <div class="signature">
      <p>TP. Hồ Chí Minh, ngày ..... tháng ..... năm .....</p>
      <p><b>NGƯỜI KHAI</b></p>
      ${profile.signature_url ? `<img src="${profile.signature_url}" />` : '<br/><br/><br/>'}
      <p><b>${safe(f.full_name || f.name)}</b></p>
    </div>
  </div>`
}

export function exportLLKHPdf(data) {
  const html = buildLLKHHtml(data)
  const wrapper = document.createElement('div')
  wrapper.innerHTML = `<style>
    .llkh-doc{font-family:Times New Roman,serif;font-size:13pt;color:#000;padding:24px;line-height:1.35}
    .llkh-doc h1{text-align:center;font-size:18pt;margin-bottom:24px}
    .llkh-doc h2{font-size:13pt;margin-top:18px}
    .llkh-doc table{width:100%;border-collapse:collapse;margin:8px 0 14px}
    .llkh-doc th,.llkh-doc td{border:1px solid #333;padding:6px;vertical-align:top}
    .signature{text-align:right;margin-top:30px}
    .signature img{max-width:160px;max-height:80px}
  </style>${html}`
  html2pdf().set({
    margin: 10,
    filename: `LLKH_${safe(data.faculty?.full_name || data.faculty?.name || 'giang_vien')}.pdf`,
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }).from(wrapper).save()
}
