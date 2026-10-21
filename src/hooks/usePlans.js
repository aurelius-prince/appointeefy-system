import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function usePlans() {
  const [plans, setPlans] = useState({ monthly: 199, annual: 1799 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('plans').select('id, price')
      .then(({ data }) => {
        if (data) {
          const map = {}
          data.forEach(p => { map[p.id] = p.price })
          setPlans(prev => ({ ...prev, ...map }))
        }
        setLoading(false)
      })

    const channel = supabase.channel('plans-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'plans' }, (payload) => {
        setPlans(prev => ({ ...prev, [payload.new.id]: payload.new.price }))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  return { plans, loading }
}
