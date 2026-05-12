import { useEffect, useState, useCallback } from 'react'
import { supabase, Container, ContainerEvent } from '../lib/supabase'

export function useContainers() {
  const [containers, setContainers] = useState<Container[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('containers')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) setError(error.message)
    else setContainers(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()

    // Realtime subscription
    const channel = supabase
      .channel('containers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'containers' }, payload => {
        if (payload.eventType === 'INSERT') {
          setContainers(prev => [payload.new as Container, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setContainers(prev => prev.map(c => c.id === payload.new.id ? payload.new as Container : c))
        } else if (payload.eventType === 'DELETE') {
          setContainers(prev => prev.filter(c => c.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  async function updateContainer(id: string, updates: Partial<Container>) {
    const { error } = await supabase.from('containers').update(updates).eq('id', id)
    return { error: error?.message ?? null }
  }

  async function getEvents(containerId: string): Promise<ContainerEvent[]> {
    const { data } = await supabase
      .from('container_events')
      .select('*')
      .eq('container_id', containerId)
      .order('occurred_at', { ascending: false })
      .limit(50)
    return data ?? []
  }

  return { containers, loading, error, refetch: fetch, updateContainer, getEvents }
}
