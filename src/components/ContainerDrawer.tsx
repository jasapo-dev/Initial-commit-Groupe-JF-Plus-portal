import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { X, MapPin, Calendar, FileText, Clock } from 'lucide-react'
import { Container, ContainerEvent, ContainerStatus } from '../lib/supabase'
import { useContainers } from '../hooks/useContainers'
import StatusBadge, { STATUS_CONFIG } from './StatusBadge'
import { useAuth } from '../hooks/useAuth'

interface Props {
  container: Container
  onClose: () => void
}

export default function ContainerDrawer({ container, onClose }: Props) {
  const [events, setEvents] = useState<ContainerEvent[]>([])
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState<ContainerStatus>(container.status as ContainerStatus)
  const [notes, setNotes] = useState(container.notes ?? '')
  const [saving, setSaving] = useState(false)
  const { getEvents, updateContainer } = useContainers()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    getEvents(container.id).then(setEvents)
  }, [container.id])

  async function handleSave() {
    setSaving(true)
    await updateContainer(container.id, { status, notes, updated_at: new Date().toISOString() })
    setSaving(false)
    setEditing(false)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="bg-brand-900 text-white px-6 py-5 flex items-start justify-between">
          <div>
            <p className="text-indigo-300 text-xs font-mono mb-1">{container.container_number}</p>
            <h2 className="font-bold text-lg">{container.client_name}</h2>
            <div className="flex items-center gap-1.5 mt-1 text-indigo-300 text-sm">
              <MapPin className="w-3.5 h-3.5" />
              {container.origin} → {container.destination}
            </div>
          </div>
          <button onClick={onClose} className="text-indigo-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Current status */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Statut actuel</h3>
              {isAdmin && !editing && (
                <button onClick={() => setEditing(true)} className="text-xs text-brand-600 hover:text-brand-800">
                  Modifier
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as ContainerStatus)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notes..."
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving} className="flex-1 bg-brand-600 text-white text-sm py-2 rounded-lg hover:bg-brand-700 transition disabled:opacity-60">
                    {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                  <button onClick={() => setEditing(false)} className="px-4 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <StatusBadge status={container.status as ContainerStatus} />
                  <span className="text-xs text-gray-400">
                    {format(new Date(container.last_update), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {container.last_location}
                </div>
                {container.eta && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    ETA : {format(new Date(container.eta), 'dd MMMM yyyy', { locale: fr })}
                  </div>
                )}
                {container.notes && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <p>{container.notes}</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Event timeline */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Historique des événements
            </h3>
            {events.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun événement enregistré.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-100" />
                <div className="space-y-4 pl-8">
                  {events.map(ev => (
                    <div key={ev.id} className="relative">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-brand-500 border-2 border-white shadow-sm" />
                      <p className="text-xs text-gray-400 mb-0.5">
                        {format(new Date(ev.occurred_at), 'dd MMM yyyy HH:mm', { locale: fr })} · {ev.location}
                      </p>
                      <p className="text-sm text-gray-700 font-medium">{ev.event_type}</p>
                      {ev.description && <p className="text-xs text-gray-500 mt-0.5">{ev.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
