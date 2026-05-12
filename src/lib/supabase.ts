import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContainerStatus =
  | 'in_transit'
  | 'at_port'
  | 'customs'
  | 'delivered'
  | 'delayed'
  | 'loading'

export interface Container {
  id: string
  container_number: string
  client_name: string
  origin: string
  destination: string
  status: ContainerStatus
  last_location: string
  last_update: string
  eta: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ContainerEvent {
  id: string
  container_id: string
  event_type: string
  location: string
  description: string
  occurred_at: string
  created_at: string
}

export interface AlertRule {
  id: string
  user_id: string
  container_id: string | null  // null = all containers
  trigger_status: ContainerStatus | 'any'
  notify_email: string | null
  notify_sms: string | null
  is_active: boolean
  created_at: string
  container?: Container
}

export interface Report {
  id: string
  name: string
  generated_by: string
  type: 'daily' | 'weekly' | 'custom'
  format: 'pdf' | 'csv'
  url: string | null
  status: 'pending' | 'ready' | 'error'
  created_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'viewer'
  phone: string | null
}
