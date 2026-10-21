import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const ServiceContext = createContext(null)

export function ServiceProvider({ children }) {
  const { user } = useAuth()
  const [services, setServices] = useState([])
  const [petTypes, setPetTypes] = useState([])
  const [loading, setLoading] = useState(true)

  const accountId = user?.account_id

  // ─── Fetch services from Supabase ───────────────────────────────
  useEffect(() => {
    if (!accountId) { setLoading(false); return }
    fetchServices()
    fetchPetTypes()
  }, [accountId])

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: true })
    if (!error) setServices(data || [])
    setLoading(false)
  }

  const fetchPetTypes = async () => {
    const { data, error } = await supabase
      .from('provider_pet_types')
      .select('*')
      .eq('account_id', accountId)
    if (!error) setPetTypes((data || []).map((p) => p.name))
  }

  // ─── Services CRUD ───────────────────────────────────────────────
  const addService = async (form) => {
    const { data, error } = await supabase
      .from('services')
      .insert({
        account_id: accountId,
        name: form.name.trim(),
        price: Number(form.price),
        duration: Number(form.duration),
        description: form.desc?.trim() || '',
        pricing_type: form.pricingType || 'per_hour',
        max_pets: Number(form.max) || 10,
        mixed_types: form.mixedTypes ?? true,
      })
      .select()
      .single()
    if (!error && data) setServices((prev) => [...prev, data])
  }

  const updateService = async (id, form) => {
    const { data, error } = await supabase
      .from('services')
      .update({
        name: form.name.trim(),
        price: Number(form.price),
        duration: Number(form.duration),
        description: form.desc?.trim() || '',
        pricing_type: form.pricingType || 'per_hour',
        max_pets: Number(form.max) || 10,
        mixed_types: form.mixedTypes ?? true,
      })
      .eq('id', id)
      .select()
      .single()
    if (!error && data) setServices((prev) => prev.map((s) => s.id === id ? data : s))
  }

  const deleteService = async (id) => {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id)
    if (!error) setServices((prev) => prev.filter((s) => s.id !== id))
  }

  // ─── Pet Types CRUD ──────────────────────────────────────────────
  const addPetTypeToDb = async (name) => {
    const { error } = await supabase
      .from('provider_pet_types')
      .insert({ account_id: accountId, name })
    if (!error) setPetTypes((prev) => [...prev, name])
  }

  const removePetTypeFromDb = async (name) => {
    const { error } = await supabase
      .from('provider_pet_types')
      .delete()
      .eq('account_id', accountId)
      .eq('name', name)
    if (!error) setPetTypes((prev) => prev.filter((p) => p !== name))
  }

  // Keep setPetTypes compatible with old array setter pattern
  const setPetTypesCompat = (fnOrArr) => {
    if (typeof fnOrArr === 'function') {
      const next = fnOrArr(petTypes)
      const added = next.filter((n) => !petTypes.includes(n))
      const removed = petTypes.filter((p) => !next.includes(p))
      added.forEach(addPetTypeToDb)
      removed.forEach(removePetTypeFromDb)
    } else {
      const added = fnOrArr.filter((n) => !petTypes.includes(n))
      const removed = petTypes.filter((p) => !fnOrArr.includes(p))
      added.forEach(addPetTypeToDb)
      removed.forEach(removePetTypeFromDb)
    }
  }

  // Map Supabase column names to what components expect
  const mappedServices = services.map((s) => ({
    ...s,
    desc: s.description || '',
    pricingType: s.pricing_type || 'per_hour',
    max: s.max_pets || 10,
    mixedTypes: s.mixed_types ?? true,
  }))

  return (
    <ServiceContext.Provider value={{
      services: mappedServices,
      petTypes,
      setPetTypes: setPetTypesCompat,
      addService,
      updateService,
      deleteService,
      loading,
    }}>
      {children}
    </ServiceContext.Provider>
  )
}

export const useService = () => useContext(ServiceContext)
