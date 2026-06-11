import { useState, useEffect, useRef, FormEvent, useCallback } from 'react'
import { motion } from 'framer-motion'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import type { EventClickArg, DateSelectArg, EventDropArg } from '@fullcalendar/core'
import type { EventInput } from '@fullcalendar/core'
import api from '../../services/api'
import { Appointment, Client } from '../../types'
import { useToast } from '../../contexts/ToastContext'

const CORES_STATUS: Record<string, { bg: string; border: string; text: string }> = {
  scheduled: { bg: 'rgba(196,138,67,0.85)', border: '#C48A43', text: '#FFFFFF' },
  completed: { bg: 'rgba(47,158,68,0.85)', border: '#2F9E44', text: '#FFFFFF' },
  cancelled: { bg: 'rgba(201,42,42,0.85)', border: '#C92A2A', text: '#FFFFFF' },
}

export function Appointments() {
  const { showToast } = useToast()
  const calendarRef = useRef<FullCalendar>(null)
  const [eventos, setEventos] = useState<EventInput[]>([])
  const [loading, setLoading] = useState(true)
  const [clientes, setClientes] = useState<Client[]>([])
  const [filtroCliente, setFiltroCliente] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<Appointment | null>(null)
  const [dataSelecionada, setDataSelecionada] = useState('')
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    title: '', description: '', appointment_date: '', appointment_time: '', client_id: 0,
  })

  const carregar = useCallback(async (filtroData?: string) => {
    try {
      setLoading(true)
      const params: any = {}
      if (filtroData) params.date = filtroData
      if (filtroCliente) params.client_id = filtroCliente
      const res = await api.get('/appointments', { params })
      const dados: Appointment[] = res.data?.data || []
      setEventos(
        dados.map((a) => {
          const inicio = a.appointment_time
            ? `${a.appointment_date}T${a.appointment_time}:00`
            : `${a.appointment_date}`
          const cor = CORES_STATUS[a.status] || CORES_STATUS.scheduled
          return {
            id: String(a.id),
            title: a.title,
            start: a.appointment_time ? `${a.appointment_date}T${a.appointment_time}:00` : a.appointment_date,
            allDay: !a.appointment_time,
            backgroundColor: cor.bg,
            borderColor: cor.border,
            textColor: cor.text,
            extendedProps: { status: a.status, client_name: a.client_name, description: a.description },
          }
        })
      )
    } catch {
      showToast('Erro ao carregar agendamentos', 'error')
    } finally {
      setLoading(false)
    }
  }, [filtroCliente, showToast])

  const carregarClientes = useCallback(async () => {
    try {
      const res = await api.get('/clients')
      setClientes(res.data?.data || [])
    } catch { /* silencioso */ }
  }, [])

  useEffect(() => { carregar(); carregarClientes() }, [carregar, carregarClientes])

  function abrirCriacao(data?: string) {
    setEditando(null)
    setError('')
    const hoje = new Date().toISOString().split('T')[0]
    setFormData({
      title: '',
      description: '',
      appointment_date: data || hoje,
      appointment_time: '',
      client_id: 0,
    })
    setDataSelecionada(data || hoje)
    setShowModal(true)
  }

  function abrirEdicao(a: Appointment) {
    setEditando(a)
    setError('')
    setFormData({
      title: a.title,
      description: a.description || '',
      appointment_date: a.appointment_date,
      appointment_time: a.appointment_time || '',
      client_id: a.client_id || 0,
    })
    setDataSelecionada(a.appointment_date)
    setShowModal(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time || null,
        client_id: formData.client_id || null,
      }
      if (editando) {
        await api.put(`/appointments/${editando.id}`, payload)
        showToast('Agendamento atualizado')
      } else {
        await api.post('/appointments', payload)
        showToast('Agendamento criado')
      }
      setShowModal(false)
      carregar()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao salvar agendamento')
    }
  }

  async function handleExcluir(id: number) {
    try {
      await api.delete(`/appointments/${id}`)
      showToast('Agendamento excluído')
      setShowModal(false)
      carregar()
    } catch {
      showToast('Erro ao excluir agendamento', 'error')
    }
  }

  async function handleAlterarStatus(id: number, status: string) {
    try {
      await api.put(`/appointments/${id}`, { status })
      showToast(`Status alterado para ${status === 'completed' ? 'Concluído' : status === 'cancelled' ? 'Cancelado' : 'Agendado'}`)
      setShowModal(false)
      carregar()
    } catch {
      showToast('Erro ao alterar status', 'error')
    }
  }

  function handleDateClick(info: DateSelectArg) {
    abrirCriacao(info.startStr.slice(0, 10))
  }

  function handleEventClick(info: EventClickArg) {
    const id = Number(info.event.id)
    const start = info.event.start
    const extended = info.event.extendedProps
    abrirEdicao({
      id,
      title: info.event.title,
      description: extended.description || null,
      appointment_date: start ? start.toISOString().slice(0, 10) : '',
      appointment_time: start ? `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}` : null,
      client_id: null,
      status: (extended.status || 'scheduled') as Appointment['status'],
      created_at: '',
      client_name: extended.client_name || null,
    })
  }

  async function handleEventDrop(info: EventDropArg) {
    try {
      const id = Number(info.event.id)
      const start = info.event.start
      if (!start) return
      const novaData = start.toISOString().slice(0, 10)
      const novaHora = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
      await api.put(`/appointments/${id}`, {
        appointment_date: novaData,
        appointment_time: info.event.allDay ? null : novaHora,
      })
      showToast('Agendamento remarcado')
      carregar()
    } catch {
      showToast('Erro ao remarcar agendamento', 'error')
      info.revert()
    }
  }

  async function handleEventResize(info: { event: { id: string } }) {
    showToast('Duração ajustada', 'info')
    carregar()
  }

  function handleFiltroCliente(valor: string) {
    setFiltroCliente(valor)
  }

  const visoes = [
    { value: 'dayGridMonth', label: 'Mês' },
    { value: 'timeGridWeek', label: 'Semana' },
    { value: 'timeGridDay', label: 'Dia' },
    { value: 'listWeek', label: 'Lista' },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-transparent min-h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>Agenda</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--nexus-muted-2)' }}>Compromissos e agendamentos</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={filtroCliente}
            onChange={(e) => handleFiltroCliente(e.target.value)}
            style={{
              height: 40, padding: '0 12px', background: 'var(--nexus-input-bg)', color: 'var(--nexus-text)',
              border: '1px solid var(--nexus-border)', borderRadius: 10, fontSize: 13, outline: 'none',
            }}
          >
            <option value="">Todos os clientes</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button
            onClick={() => abrirCriacao()}
            style={{
              height: 40, padding: '0 20px', background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))',
              color: '#fff', border: 'none', borderRadius: 10, fontWeight: 500, cursor: 'pointer', fontSize: 13,
            }}
          >
            Novo Agendamento
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-hidden rounded-xl"
        style={{
          background: 'var(--nexus-bg-panel)',
          border: '1px solid var(--nexus-border)',
          padding: '1rem',
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--nexus-gold)', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
            }}
            buttonText={{
              today: 'Hoje',
              month: 'Mês',
              week: 'Semana',
              day: 'Dia',
              list: 'Lista',
            }}
            locales={[ptBrLocale]}
            locale="pt-br"
            firstDay={0}
            weekends={true}
            height="auto"
            events={eventos}
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={3}
            moreLinkText={(num) => `+${num} mais`}
            noEventsText="Nenhum agendamento para este período"
            navLinks={true}
            dateClick={(info) => {
              const ev = { startStr: info.dateStr, endStr: info.dateStr, start: info.date, end: info.date, allDay: true } as DateSelectArg
              handleDateClick(ev)
            }}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={true}
            nowIndicator={true}
            eventDurationEditable={true}
            eventStartEditable={true}
          />
        )}
      </div>

      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem', background: 'var(--nexus-overlay)', backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: 'var(--nexus-card-strong)', border: '1px solid var(--nexus-border)', borderRadius: 18,
              padding: '1.75rem', width: '100%', maxWidth: 480, position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--nexus-text)', marginBottom: 20 }}>
              {editando ? 'Editar Agendamento' : 'Novo Agendamento'}
            </h2>

            {editando && (
              <div className="flex gap-2 mb-4">
                {['scheduled', 'completed', 'cancelled'].map((s) => {
                  const labels: Record<string, string> = { scheduled: 'Agendado', completed: 'Concluído', cancelled: 'Cancelado' }
                  return (
                    <button
                      key={s}
                      onClick={() => handleAlterarStatus(editando.id, s)}
                      style={{
                        padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500, border: 'none',
                        background: editando.status === s
                          ? CORES_STATUS[s].bg
                          : 'var(--nexus-card)',
                        color: editando.status === s ? '#fff' : 'var(--nexus-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      {labels[s]}
                    </button>
                  )
                })}
              </div>
            )}

            {error && (
              <div style={{
                background: 'rgba(var(--nexus-danger-rgb),0.12)', color: 'var(--nexus-danger)',
                border: '1px solid rgba(var(--nexus-danger-rgb),0.2)', borderRadius: 10,
                padding: '10px 14px', fontSize: 13, marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ color: 'var(--nexus-text)', fontSize: 13, fontWeight: 500, marginBottom: 4, display: 'block' }}>Título</label>
                <input type="text" required value={formData.title}
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--nexus-input-bg)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: 10, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ color: 'var(--nexus-text)', fontSize: 13, fontWeight: 500, marginBottom: 4, display: 'block' }}>Data</label>
                  <input type="date" required value={formData.appointment_date}
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--nexus-input-bg)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: 10, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                    onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })} />
                </div>
                <div>
                  <label style={{ color: 'var(--nexus-text)', fontSize: 13, fontWeight: 500, marginBottom: 4, display: 'block' }}>Horário</label>
                  <input type="time" value={formData.appointment_time}
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--nexus-input-bg)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: 10, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                    onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ color: 'var(--nexus-text)', fontSize: 13, fontWeight: 500, marginBottom: 4, display: 'block' }}>Cliente</label>
                <select value={formData.client_id}
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--nexus-input-bg)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: 10, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                  onChange={(e) => setFormData({ ...formData, client_id: Number(e.target.value) })}>
                  <option value={0}>Nenhum</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: 'var(--nexus-text)', fontSize: 13, fontWeight: 500, marginBottom: 4, display: 'block' }}>Descrição</label>
                <textarea rows={3} value={formData.description}
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--nexus-input-bg)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: 10, fontSize: 13, boxSizing: 'border-box', resize: 'vertical', outline: 'none' }}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {editando && (
                  <button type="button" onClick={() => handleExcluir(editando.id)}
                    style={{ background: 'rgba(var(--nexus-danger-rgb),0.12)', color: 'var(--nexus-danger)', border: 'none', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                    Excluir
                  </button>
                )}
                <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                  <button type="button" onClick={() => setShowModal(false)}
                    style={{ background: 'var(--nexus-card)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
                    Cancelar
                  </button>
                  <button type="submit"
                    style={{ background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontWeight: 500, cursor: 'pointer', fontSize: 13 }}>
                    Salvar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  )
}
