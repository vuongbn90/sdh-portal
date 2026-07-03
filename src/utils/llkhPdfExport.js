import html2pdf from 'html2pdf.js'

export async function exportLLKHPdf(element, facultyName = 'giang_vien') {
  const fileName = `LLKH_${String(facultyName || 'giang_vien').replaceAll(' ', '_')}.pdf`
  const options = {
    margin: [10, 10, 10, 10],
    filename: fileName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  }
  await html2pdf().set(options).from(element).save()
}
