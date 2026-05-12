import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Download, FileText, FileCsv, Calendar } from 'lucide-react'
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useContainers } from '../hooks/useContainers'
import { generatePDF, generateCSV } from '../lib/reports'
import { ContainerStatus } from '../lib/supabase'
import { STATUS_CONFIG } from '../components/StatusBadge'

type DateRange = '7d' | '30d' | 'this_week' | 'custom'

export default function ReportsPage() {
  const { containers } = useContainers()
  const [range, setRange] = useState<DateRange>('30d')
  const [customFrom, setCustomFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [customTo, setCustomTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [statusFilter, setStatusFilter] = useState<string>('all')

  function getFilteredContainers() {
    let from: Date, to: Date = new Date()
    if (range === '7d') from = subDays(to, 7)
    else if (range === '30d') from = subDays(to, 30)
    else if (range === 'this_week') { from = startOfWeek(to, { locale: fr }); to = endOfWeek(to, { locale: fr }) }
    else { from = new Date(customFrom); to = new Date(customTo) }

    return containers.filter(c => {
      const updatedAt = new Date(c.updated_at)
      const inRange = updatedAt >= from && updatedAt <= to
      const matchStatus = statusFilter === 'all' || c.status === statusFilter
      return inRange && matchStatus
    })
  }

  const filtered = getFilteredContainers()

  const stats = {
    total: filtered.length,
    byStatus: Object.fromEntries(
      Object.keys(STATUS_CONFIG).map(s => [s, filtered.filter(c => c.status === s).length])
    ) as Record<string, number>,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-900 text-white px-6 py-4 flex items-center gap-3">
        <Link to="/" className="text-indigo-300 hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-bold">Rapports</h1>
          <p className="text-indigo-300 text-xs">Génération PDF et CSV</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Paramètres du rapport</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Période</label>
              <select
                value={range}
                onChange={e => setRange(e.target.value as DateRange)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="7d">7 derniers jours</option>
                <option value="30d">30 derniers jours</option>
                <option value="this_week">Cette semaine</option>
                <option value="custom">Personnalisé</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filtrer par statut</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">Tous les statuts</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            {range === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Du</label>
                  <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Au</label>
                  <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Preview stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Aperçu — {filtered.length} conteneur(s)</h2>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(stats.byStatus).filter(([, count]) => count > 0).map(([status, count]) => (
              <div key={status} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-800">{count}</p>
                <p className="text-xs text-gray-500 mt-1">{STATUS_CONFIG[status as ContainerStatus]?.label ?? status}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Export buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => generatePDF(filtered, 'Rapport Groupe JF Plus')}
            disabled={filtered.length === 0}
            className="flex items-center justify-center gap-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white rounded-xl p-5 transition group"
          >
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-semibold">Exporter en PDF</p>
              <p className="text-indigo-200 text-xs">{filtered.length} conteneurs · Tableau formaté</p>
            </div>
            <Download className="w-4 h-4 ml-auto opacity-70 group-hover:opacity-100" />
          </button>

          <button
            onClick={() => generateCSV(filtered)}
            disabled={filtered.length === 0}
            className="flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-xl p-5 transition group"
          >
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-semibold">Exporter en CSV</p>
              <p className="text-green-200 text-xs">{filtered.length} conteneurs · Compatible Excel</p>
            </div>
            <Download className="w-4 h-4 ml-auto opacity-70 group-hover:opacity-100" />
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>Rapport automatique quotidien :</strong> Un rapport PDF est généré et envoyé à{' '}
          <a href="mailto:info@groupejfplus.com" className="underline">info@groupejfplus.com</a>{' '}
          chaque matin à 06h00 UTC via Supabase Edge Functions (cron). Voir <code className="bg-amber-100 px-1 rounded">supabase/functions/generate-report</code>.
        </div>
      </main>
    </div>
  )
}
