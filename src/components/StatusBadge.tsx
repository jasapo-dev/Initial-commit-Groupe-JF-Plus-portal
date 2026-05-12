import { ContainerStatus } from '../lib/supabase'

const STATUS_CONFIG: Record<ContainerStatus, { label: string; classes: string }> = {
  in_transit:  { label: 'En transit',   classes: 'bg-blue-100 text-blue-800' },
  at_port:     { label: 'Au port',      classes: 'bg-cyan-100 text-cyan-800' },
  customs:     { label: 'En douane',    classes: 'bg-amber-100 text-amber-800' },
  delivered:   { label: 'Livré',        classes: 'bg-green-100 text-green-800' },
  delayed:     { label: 'Retardé',      classes: 'bg-red-100 text-red-800' },
  loading:     { label: 'Chargement',   classes: 'bg-purple-100 text-purple-800' },
}

export default function StatusBadge({ status }: { status: ContainerStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, classes: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.classes}`}>
      {cfg.label}
    </span>
  )
}

export { STATUS_CONFIG }
