import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function usePlans() {
  const [plans, setPlans] = useState({ monthly: 199, annual: 1799 })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('plans').select('id, price')
    if (data) {
      const map = {}
      data.forEach(p => { map[p.id] = p.price })
      setPlans(prev => ({ ...prev, ...map }))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()

    const channel = supabase.channel('plans-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'plans' }, (payload) => {
        setPlans(prev => ({ ...prev, [payload.new.id]: payload.new.price }))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [refresh])

  return { plans, loading, refresh }
}
