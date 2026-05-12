import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { Container } from './supabase'

const STATUS_LABELS: Record<string, string> = {
  in_transit: 'En transit',
  at_port: 'Au port',
  customs: 'En douane',
  delivered: 'Livré',
  delayed: 'Retardé',
  loading: 'Chargement',
}

export function generatePDF(containers: Container[], title = 'Rapport de conteneurs'): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Header
  doc.setFillColor(30, 27, 75)
  doc.rect(0, 0, 297, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('GROUPE JF PLUS', 12, 14)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(title, 80, 14)
  doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 220, 14)

  // Summary stats
  const stats = {
    total: containers.length,
    inTransit: containers.filter(c => c.status === 'in_transit').length,
    atPort: containers.filter(c => c.status === 'at_port').length,
    delayed: containers.filter(c => c.status === 'delayed').length,
    delivered: containers.filter(c => c.status === 'delivered').length,
  }

  doc.setTextColor(30, 27, 75)
  doc.setFontSize(9)
  const statY = 30
  const stats_text = [
    `Total: ${stats.total}`,
    `En transit: ${stats.inTransit}`,
    `Au port: ${stats.atPort}`,
    `Retardés: ${stats.delayed}`,
    `Livrés: ${stats.delivered}`,
  ]
  stats_text.forEach((t, i) => doc.text(t, 12 + i * 55, statY))

  // Table
  autoTable(doc, {
    startY: 38,
    head: [['N° Conteneur', 'Client', 'Origine', 'Destination', 'Statut', 'Localisation', 'Dernière MAJ', 'ETA']],
    body: containers.map(c => [
      c.container_number,
      c.client_name,
      c.origin,
      c.destination,
      STATUS_LABELS[c.status] ?? c.status,
      c.last_location,
      format(new Date(c.last_update), 'dd/MM/yyyy HH:mm'),
      c.eta ? format(new Date(c.eta), 'dd/MM/yyyy') : '-',
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [238, 242, 255] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      4: { fontStyle: 'bold' },
    },
    didParseCell(data) {
      if (data.column.index === 4 && data.section === 'body') {
        const val = data.cell.raw as string
        if (val === 'Retardé') data.cell.styles.textColor = [185, 28, 28]
        else if (val === 'Livré') data.cell.styles.textColor = [21, 128, 61]
        else if (val === 'En transit') data.cell.styles.textColor = [29, 78, 216]
      }
    },
  })

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text(`Page ${i} / ${pageCount}`, 148, 205, { align: 'center' })
    doc.text('Groupe JF Plus — Confidentiel', 12, 205)
    doc.text('info@groupejfplus.com', 240, 205)
  }

  doc.save(`rapport-conteneurs-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}

export function generateCSV(containers: Container[]): void {
  const headers = ['N° Conteneur', 'Client', 'Origine', 'Destination', 'Statut', 'Localisation', 'Dernière MAJ', 'ETA', 'Notes']
  const rows = containers.map(c => [
    c.container_number,
    c.client_name,
    c.origin,
    c.destination,
    STATUS_LABELS[c.status] ?? c.status,
    c.last_location,
    format(new Date(c.last_update), 'dd/MM/yyyy HH:mm'),
    c.eta ? format(new Date(c.eta), 'dd/MM/yyyy') : '',
    c.notes ?? '',
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `conteneurs-${format(new Date(), 'yyyy-MM-dd')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
