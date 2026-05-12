import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Bell, BellOff } from 'lucide-react'
import { supabase, AlertRule, ContainerStatus } from '../lib/supabase'
import { useContainers } from '../hooks/useContainers'
import { useAuth } from '../hooks/useAuth'
import { STATUS_CONFIG } from '../components/StatusBadge'

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const { containers } = useContainers()
  const { user } = useAuth()

  const [form, setForm] = useState({
    container_id: '',
    trigger_status: 'delayed' as ContainerStatus | 'any',
    notify_email: '',
    notify_sms: '',
  })

  useEffect(() => { fetchRules() }, [])

  async function fetchRules() {
    const { data } = await supabase
      .from('alert_rules')
      .select('*, container:containers(container_number, client_name)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
    setRules(data ?? [])
    setLoading(false)
  }

  async function handleAdd() {
    if (!form.notify_email && !form.notify_sms) {
      alert('Veuillez fournir un courriel ou un numéro SMS.')
      return
    }
    const { error } = await supabase.from('alert_rules').insert({
      user_id: user!.id,
      container_id: form.container_id || null,
      trigger_status: form.trigger_status,
      notify_email: form.notify_email || null,
      notify_sms: form.notify_sms || null,
      is_active: true,
    })
    if (!error) {
      setShowForm(false)
      setForm({ container_id: '', trigger_status: 'delayed', notify_email: '', notify_sms: '' })
      fetchRules()
    }
  }

  async function toggleRule(id: string, current: boolean) {
    await supabase.from('alert_rules').update({ is_active: !current }).eq('id', id)
    fetchRules()
  }

  async function deleteRule(id: string) {
    if (!confirm('Supprimer cette règle d\'alerte?')) return
    await supabase.from('alert_rules').delete().eq('id', id)
    setRules(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-indigo-300 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold">Alertes & Notifications</h1>
            <p className="text-indigo-300 text-xs">Règles SMS et courriel</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-4 h-4" /> Nouvelle règle
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
          <strong>Comment ça fonctionne :</strong> Les règles d'alerte sont évaluées toutes les 15 minutes
          via Supabase Edge Functions. Quand le statut d'un conteneur correspond à votre règle,
          un SMS (Twilio) et/ou un courriel (Resend) est envoyé automatiquement.
        </div>

        {/* New rule form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <h3 className="font-semibold text-gray-800 mb-4">Nouvelle règle d'alerte</h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conteneur (laisser vide = tous)</label>
                <select
                  value={form.container_id}
                  onChange={e => setForm(f => ({ ...f, container_id: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Tous les conteneurs</option>
                  {containers.map(c => (
                    <option key={c.id} value={c.id}>{c.container_number} — {c.client_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Déclencher quand le statut devient</label>
                <select
                  value={form.trigger_status}
                  onChange={e => setForm(f => ({ ...f, trigger_status: e.target.value as ContainerStatus | 'any' }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="any">N'importe quel changement</option>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notifier par courriel</label>
                <input
                  type="email"
                  value={form.notify_email}
                  onChange={e => setForm(f => ({ ...f, notify_email: e.target.value }))}
                  placeholder="info@groupejfplus.com"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notifier par SMS</label>
                <input
                  type="tel"
                  value={form.notify_sms}
                  onChange={e => setForm(f => ({ ...f, notify_sms: e.target.value }))}
                  placeholder="+15141234567"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleAdd} className="bg-brand-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-700 transition">
                Créer la règle
              </button>
              <button onClick={() => setShowForm(false)} className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition">
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Rules list */}
        <div className="space-y-3">
          {loading && <p className="text-gray-400 text-sm text-center py-8">Chargement...</p>}
          {!loading && rules.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucune règle d'alerte configurée.</p>
            </div>
          )}
          {rules.map(rule => (
            <div key={rule.id} className={`bg-white rounded-xl border p-4 flex items-center justify-between gap-3 ${!rule.is_active ? 'opacity-50' : 'border-gray-200'}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${rule.is_active ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                  <Bell className={`w-4 h-4 ${rule.is_active ? 'text-brand-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {rule.container ? `${(rule.container as any).container_number}` : 'Tous les conteneurs'}
                    {' → '}
                    <span className="text-brand-600">{rule.trigger_status === 'any' ? 'tout changement' : STATUS_CONFIG[rule.trigger_status as ContainerStatus]?.label ?? rule.trigger_status}</span>
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {rule.notify_email && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">✉ {rule.notify_email}</span>}
                    {rule.notify_sms && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">📱 {rule.notify_sms}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleRule(rule.id, rule.is_active)} title={rule.is_active ? 'Désactiver' : 'Activer'} className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition">
                  {rule.is_active ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </button>
                <button onClick={() => deleteRule(rule.id)} className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
