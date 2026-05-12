import { useState, useMemo } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Search, RefreshCw, Download, FileText, Bell, LogOut, Package, AlertTriangle, CheckCircle, Clock, Loader2 } from 'lucide-react'
import { useContainers } from '../hooks/useContainers'
import { useAuth } from '../hooks/useAuth'
import { generatePDF, generateCSV } from '../lib/reports'
import StatusBadge, { STATUS_CONFIG } from '../components/StatusBadge'
import { ContainerStatus, Container } from '../lib/supabase'
import { Link } from 'react-router-dom'
import ContainerDrawer from '../components/ContainerDrawer'

const STATUS_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Tous' },
  ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label })),
]

export default function DashboardPage() {
  const { containers, loading, refetch } = useContainers()
  const { profile, signOut } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selected, setSelected] = useState<Container | null>(null)
  const [exporting, setExporting] = useState(false)

  const filtered = useMemo(() => {
    return containers.filter(c => {
      const matchStatus = statusFilter === 'all' || c.status === statusFilter
      const q = search.toLowerCase()
      const matchSearch = !q || [c.container_number, c.client_name, c.origin, c.destination, c.last_location]
        .some(f => f?.toLowerCase().includes(q))
      return matchStatus && matchSearch
    })
  }, [containers, search, statusFilter])

  const stats = useMemo(() => ({
    total: containers.length,
    delayed: containers.filter(c => c.status === 'delayed').length,
    delivered: containers.filter(c => c.status === 'delivered').length,
    inTransit: containers.filter(c => c.status === 'in_transit').length,
  }), [containers])

  async function handleExportPDF() {
    setExporting(true)
    setTimeout(() => { generatePDF(filtered); setExporting(false) }, 100)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-brand-900 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Package className="w-7 h-7 text-indigo-300" />
          <div>
            <h1 className="font-bold text-lg leading-tight">Groupe JF Plus</h1>
            <p className="text-indigo-300 text-xs">Suivi de conteneurs</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/alerts" className="flex items-center gap-1.5 text-indigo-200 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition">
            <Bell className="w-4 h-4" /> Alertes
          </Link>
          <Link to="/reports" className="flex items-center gap-1.5 text-indigo-200 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition">
            <FileText className="w-4 h-4" /> Rapports
          </Link>
          <div className="w-px h-5 bg-white/20 mx-1" />
          <span className="text-indigo-300 text-xs hidden sm:block">{profile?.email}</span>
          <button onClick={signOut} className="text-indigo-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total conteneurs" value={stats.total} icon={<Package className="w-5 h-5 text-brand-500" />} />
          <StatCard label="En transit" value={stats.inTransit} icon={<Clock className="w-5 h-5 text-blue-500" />} />
          <StatCard label="Retardés" value={stats.delayed} icon={<AlertTriangle className="w-5 h-5 text-red-500" />} highlight={stats.delayed > 0} />
          <StatCard label="Livrés" value={stats.delivered} icon={<CheckCircle className="w-5 h-5 text-green-500" />} />
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher numéro, client, lieu..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            {STATUS_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={refetch} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleExportPDF} disabled={exporting} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition">
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              PDF
            </button>
            <button onClick={() => generateCSV(filtered)} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{filtered.length} conteneur{filtered.length !== 1 ? 's' : ''}</span>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">N° Conteneur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Trajet</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Localisation</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">MAJ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">ETA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 && !loading && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">Aucun conteneur trouvé</td></tr>
                )}
                {filtered.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="hover:bg-indigo-50/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-brand-700">{c.container_number}</td>
                    <td className="px-4 py-3 text-gray-700">{c.client_name}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      <span>{c.origin}</span>
                      <span className="mx-1.5 text-gray-300">→</span>
                      <span>{c.destination}</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={c.status as ContainerStatus} /></td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{c.last_location}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                      {formatDistanceToNow(new Date(c.last_update), { addSuffix: true, locale: fr })}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">
                      {c.eta ? format(new Date(c.eta), 'dd MMM yyyy', { locale: fr }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {selected && <ContainerDrawer container={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function StatCard({ label, value, icon, highlight }: { label: string; value: number; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`bg-white rounded-xl border p-4 ${highlight ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${highlight ? 'text-red-600' : 'text-gray-800'}`}>{value}</p>
    </div>
  )
}
