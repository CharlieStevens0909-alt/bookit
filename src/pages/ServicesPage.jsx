import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../lib/BusinessContext'

const emptyForm = { name: '', duration_minutes: '', price: '' }

export default function ServicesPage() {
  const { business } = useBusiness()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!business) return
    fetchServices()
  }, [business])

  async function fetchServices() {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .order('name')
    setServices(data || [])
    setLoading(false)
  }

  async function handleAdd(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const { data, error } = await supabase
      .from('services')
      .insert({
        business_id: business.id,
        name: form.name,
        duration_minutes: parseInt(form.duration_minutes),
        price: parseFloat(form.price),
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
    } else {
      setServices(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setForm(emptyForm)
    }

    setSaving(false)
  }

  async function handleSaveEdit(id) {
    setSaving(true)

    const { data, error } = await supabase
      .from('services')
      .update({
        name: editForm.name,
        duration_minutes: parseInt(editForm.duration_minutes),
        price: parseFloat(editForm.price),
      })
      .eq('id', id)
      .select()
      .single()

    if (!error) {
      setServices(prev =>
        prev.map(s => s.id === id ? data : s).sort((a, b) => a.name.localeCompare(b.name))
      )
      setEditingId(null)
    }

    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this service?')) return
    await supabase.from('services').delete().eq('id', id)
    setServices(prev => prev.filter(s => s.id !== id))
  }

  function startEdit(service) {
    setEditingId(service.id)
    setEditForm({
      name: service.name,
      duration_minutes: service.duration_minutes.toString(),
      price: service.price.toString(),
    })
  }

  const inputClass = "border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"

  if (loading) return <p className="text-slate-400">Loading...</p>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Services</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage what customers can book</p>
      </div>

      {/* Services list */}
      {services.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 mb-6">
          {services.map(service => (
            <div key={service.id} className="p-4">
              {editingId === service.id ? (
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    className={`${inputClass} flex-1 min-w-32`}
                    value={editForm.name}
                    onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Service name"
                  />
                  <input
                    className={`${inputClass} w-24`}
                    type="number"
                    value={editForm.duration_minutes}
                    onChange={e => setEditForm(p => ({ ...p, duration_minutes: e.target.value }))}
                    placeholder="Mins"
                  />
                  <input
                    className={`${inputClass} w-24`}
                    type="number"
                    step="0.01"
                    value={editForm.price}
                    onChange={e => setEditForm(p => ({ ...p, price: e.target.value }))}
                    placeholder="£ Price"
                  />
                  <button
                    onClick={() => handleSaveEdit(service.id)}
                    disabled={saving}
                    className="text-sm bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-sm text-slate-500 hover:text-slate-700 px-2"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{service.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{service.duration_minutes} min · £{Number(service.price).toFixed(2)}</p>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button
                      onClick={() => startEdit(service)}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add service form */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Add a service</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-40">
            <label className="block text-xs text-slate-500 mb-1">Name</label>
            <input
              className={`${inputClass} w-full`}
              required
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Haircut"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs text-slate-500 mb-1">Duration (mins)</label>
            <input
              className={`${inputClass} w-full`}
              type="number"
              required
              min={5}
              value={form.duration_minutes}
              onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))}
              placeholder="30"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs text-slate-500 mb-1">Price (£)</label>
            <input
              className={`${inputClass} w-full`}
              type="number"
              required
              min={0}
              step="0.01"
              value={form.price}
              onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
              placeholder="15.00"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            Add
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    </div>
  )
}
