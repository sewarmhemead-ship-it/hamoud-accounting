import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, usersApi } from '../api'
import AdminSettingsTab from '../components/admin/AdminSettingsTab'
import { useAuthStore, useUiStore } from '../store/auth.store'
import { formatDate } from '../utils/format'

/* ─────────────── ألوان الأدوار والإجراءات ─────────────── */
const ROLE_BADGE = {
  admin: { label: 'مشرف',  cls: 'bg-accent/15 text-accent border border-accent/25' },
  user:  { label: 'موظف',  cls: 'bg-surface-raised text-ink-soft border border-surface-border' },
}

const ACTION_META = {
  create:    { label: 'إنشاء',    color: '#22c55e' },
  update:    { label: 'تحديث',   color: '#3b82f6' },
  delete:    { label: 'حذف',     color: '#ef4444' },
  post:      { label: 'ترحيل',   color: '#c9a84c' },
  deliver:   { label: 'تسليم',   color: '#a78bfa' },
  payment:   { label: 'دفعة',    color: '#34d399' },
  offset:    { label: 'مقاصة',   color: '#f59e0b' },
  bulk_post: { label: 'ترحيل جماعي', color: '#c9a84c' },
}

const ENTITY_LABEL = {
  shipment:    'سيارة',
  transaction: 'معاملة',
  center:      'مركز',
  user:        'مستخدم',
}

/* ─────────────── مكوّن التبويب ─────────────── */
function Tab({ id, active, onClick, icon, children, count }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
        active
          ? 'text-accent'
          : 'text-ink-soft hover:text-ink'
      }`}
      style={active ? {
        background: 'rgba(201,168,76,0.1)',
        border: '1px solid rgba(201,168,76,0.2)',
        boxShadow: 'inset 0 0 16px rgba(201,168,76,0.04)',
      } : {
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <span>{icon}</span>
      {children}
      {count !== undefined && (
        <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${active ? 'bg-accent/20 text-accent' : 'bg-white/8 text-ink-faint'}`}>
          {count}
        </span>
      )}
    </button>
  )
}

/* ─────────────── مكوّن Toggle ─────────────── */
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-all duration-300 ${checked ? 'bg-success/60' : 'bg-white/10'}`}
      style={{ border: `1px solid ${checked ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}` }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300"
        style={{ right: checked ? '2px' : '18px', opacity: checked ? 1 : 0.6 }}
      />
    </button>
  )
}

/* ─────────────── مكوّن الصلاحيات ─────────────── */
function PermissionsEditor({ groups, templates, selected, onChange }) {
  const toggle = (key) => {
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key])
  }
  const applyTemplate = (tpl) => onChange([...new Set(tpl.perms)])
  const allKeys = groups.flatMap((g) => g.items.map((i) => i.key))
  const allSelected = allKeys.every((k) => selected.includes(k))

  return (
    <div className="space-y-4">
      {/* قوالب سريعة */}
      <div>
        <p className="text-xs text-ink-faint mb-2">قالب جاهز:</p>
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => applyTemplate(t)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: t.color + '18',
                color: t.color,
                border: `1px solid ${t.color}35`,
              }}
              title={t.desc}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange(allSelected ? [] : allKeys)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium btn-secondary"
          >
            {allSelected ? 'إلغاء الكل' : 'تحديد الكل'}
          </button>
        </div>
      </div>

      {/* مجموعات الصلاحيات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {groups.map((group) => {
          const groupKeys = group.items.map((i) => i.key)
          const groupAll  = groupKeys.every((k) => selected.includes(k))
          const groupAny  = groupKeys.some((k) => selected.includes(k))
          return (
            <div key={group.label} className="rounded-xl overflow-hidden"
                 style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {/* رأس المجموعة */}
              <button
                type="button"
                onClick={() => {
                  const next = groupAll ? selected.filter((k) => !groupKeys.includes(k)) : [...new Set([...selected, ...groupKeys])]
                  onChange(next)
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-ink-soft hover:text-ink transition-colors"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span>{group.label}</span>
                <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] transition-all ${
                  groupAll ? 'bg-accent/80 text-black' : groupAny ? 'bg-white/15 text-ink-faint' : 'bg-white/8 text-ink-faint'
                }`}>
                  {groupAll ? '✓' : groupAny ? '−' : ''}
                </span>
              </button>
              {/* الصلاحيات الفردية */}
              <div className="p-2 space-y-1">
                {group.items.map((item) => {
                  const active = selected.includes(item.key)
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggle(item.key)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150 text-right"
                      style={{
                        background: active ? 'rgba(201,168,76,0.08)' : 'transparent',
                        color: active ? '#c9a84c' : '#8891a8',
                      }}
                    >
                      <span className={`w-4 h-4 rounded shrink-0 flex items-center justify-center text-[10px] transition-all ${
                        active ? 'bg-accent/70 text-black' : 'border border-surface-border'
                      }`}>
                        {active ? '✓' : ''}
                      </span>
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-ink-faint">
        {selected.length} صلاحية من {allKeys.length} مُفعّلة
      </p>
    </div>
  )
}

/* ─────────────── تبويب المستخدمين ─────────────── */
function UsersTab({ stats }) {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId]     = useState(null)
  const [form, setForm]         = useState({ username: '', password: '', name: '', role: 'user', permissions: [] })
  const queryClient = useQueryClient()
  const showToast   = useUiStore((s) => s.showToast)
  const currentUser = useAuthStore((s) => s.user)

  const { data, isLoading }     = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() })
  const { data: configRes }     = useQuery({ queryKey: ['perm-config'], queryFn: () => adminApi.permConfig() })
  const permGroups   = configRes?.data?.groups    || []
  const permTemplates = configRes?.data?.templates || []

  const createMut = useMutation({
    mutationFn: (d) => usersApi.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users', 'admin-stats'] }); resetForm(); showToast('تم إنشاء المستخدم', 'success') },
    onError: (e) => showToast(e.message, 'error'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => usersApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); resetForm(); showToast('تم التحديث', 'success') },
    onError: (e) => showToast(e.message, 'error'),
  })
  const deleteMut = useMutation({
    mutationFn: (id) => usersApi.remove(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users', 'admin-stats'] }); showToast('تم الحذف', 'success') },
    onError: (e) => showToast(e.message, 'error'),
  })
  const applyTemplateMut = useMutation({
    mutationFn: () =>
      usersApi.applyPermissionsTemplate({ templateId: 'full', mode: 'replace' }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      showToast(res.message || 'تم تحديث الصلاحيات', 'success')
    },
    onError: (e) => showToast(e.message, 'error'),
  })

  const resetForm = () => {
    setShowForm(false); setEditId(null)
    setForm({ username: '', password: '', name: '', role: 'user', permissions: [] })
  }
  const startEdit = (u) => {
    setEditId(u.id); setShowForm(false)
    setForm({ username: u.username, password: '', name: u.name, role: u.role, permissions: u.permissions || [] })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = { name: form.name, role: form.role, permissions: form.permissions }
    if (form.password) payload.password = form.password
    if (editId) {
      updateMut.mutate({ id: editId, data: payload })
    } else {
      createMut.mutate({ ...payload, username: form.username })
    }
  }

  const users = data?.data || []
  const isAdmin = form.role === 'admin'

  const handleApplyFullTemplate = () => {
    const n = users.filter((u) => u.role !== 'admin').length
    if (
      !window.confirm(
        `تطبيق قالب «صلاحيات كاملة» على ${n} موظف (غير المشرفين)؟\nسيتم استبدال صلاحياتهم الحالية بالقالب الكامل (يشمل profit_edit_closed).`
      )
    ) {
      return
    }
    applyTemplateMut.mutate()
  }

  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        style={{
          background: 'rgba(201,168,76,0.08)',
          border: '1px solid rgba(201,168,76,0.22)',
        }}
      >
        <div>
          <p className="text-sm font-semibold text-ink">تحديث صلاحيات المشرفين / الموظفين القدامى</p>
          <p className="text-[11px] text-ink-soft mt-1 leading-relaxed">
            يطبّق قالب «صلاحيات كاملة» على كل حسابات الموظفين (ما عدا admin). مفيد بعد إضافة صلاحيات جديدة مثل تعديل يوم مُغلق.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary !py-2 !px-4 text-sm shrink-0"
          disabled={applyTemplateMut.isPending}
          onClick={handleApplyFullTemplate}
        >
          {applyTemplateMut.isPending ? 'جاري التحديث…' : 'تطبيق صلاحيات كاملة'}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-ink-soft text-sm">{users.length} مستخدم مسجّل</p>
        {!editId && (
          <button type="button" className="btn-primary !py-1.5 !px-4 text-[13px]"
            onClick={() => { setShowForm(!showForm); setEditId(null) }}>
            {showForm ? 'إلغاء' : '+ مستخدم جديد'}
          </button>
        )}
      </div>

      {(showForm || editId !== null) && (
        <form className="card space-y-5" onSubmit={handleSubmit}>
          <h4 className="font-semibold text-ink">{editId ? 'تعديل المستخدم' : 'مستخدم جديد'}</h4>

          {/* البيانات الأساسية */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!editId && (
              <div>
                <label className="label text-xs">اسم المستخدم *</label>
                <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required placeholder="user123" />
              </div>
            )}
            <div>
              <label className="label text-xs">الاسم الكامل *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="أحمد الصالح" />
            </div>
            <div>
              <label className="label text-xs">{editId ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور *'}</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editId} minLength={6} />
            </div>
            <div>
              <label className="label text-xs">نوع الحساب</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="user">موظف (صلاحيات مخصّصة)</option>
                <option value="admin">مشرف (كل الصلاحيات)</option>
              </select>
            </div>
          </div>

          {/* الصلاحيات — تظهر فقط للموظف */}
          {!isAdmin && permGroups.length > 0 && (
            <div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} className="pt-4">
                <p className="text-sm font-medium text-ink mb-3">صلاحيات المستخدم</p>
                <PermissionsEditor
                  groups={permGroups}
                  templates={permTemplates}
                  selected={form.permissions}
                  onChange={(p) => setForm({ ...form, permissions: p })}
                />
              </div>
            </div>
          )}
          {isAdmin && (
            <div className="rounded-xl px-4 py-3 text-sm"
                 style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}>
              <span className="text-accent">⚡ المشرف يملك كل الصلاحيات تلقائياً</span>
            </div>
          )}

          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-sm" disabled={createMut.isPending || updateMut.isPending}>
              {editId ? 'حفظ التعديلات' : 'إنشاء المستخدم'}
            </button>
            <button type="button" className="btn-secondary text-sm" onClick={resetForm}>إلغاء</button>
          </div>
        </form>
      )}

      {isLoading ? <p className="text-ink-faint text-sm">جاري التحميل...</p> : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['المستخدم', 'الاسم', 'النوع', 'الصلاحيات', 'تاريخ الإنشاء', ''].map((h) => (
                  <th key={h} className="text-right py-3 px-4 text-xs text-ink-faint font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const badge = ROLE_BADGE[u.role] || ROLE_BADGE.user
                const permCount = u.role === 'admin' ? '∞' : (u.permissions?.length ?? 0)
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-ink-soft">{u.username}</td>
                    <td className="py-3 px-4 text-ink font-medium">{u.name}</td>
                    <td className="py-3 px-4">
                      <span className={`pill text-[11px] ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-ink-faint">
                        {u.role === 'admin'
                          ? <span className="text-accent font-medium">كاملة ∞</span>
                          : <span>{permCount} صلاحية</span>
                        }
                      </span>
                    </td>
                    <td className="py-3 px-4 text-ink-faint text-xs">{formatDate(u.created_at)}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-3 justify-end">
                        <button type="button" onClick={() => startEdit(u)}
                          className="text-xs text-accent hover:text-accent-hover transition-colors">تعديل</button>
                        {u.id !== currentUser?.id && (
                          <button type="button"
                            onClick={() => { if (window.confirm(`حذف "${u.name}"؟`)) deleteMut.mutate(u.id) }}
                            className="text-xs text-danger hover:text-red-400 transition-colors">حذف</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ─────────────── تبويب عناصر البيانات (معابر / أنواع بضائع) ─────────────── */
function LookupTab({ queryKey, fetchFn, createFn, updateFn, noun, namePlaceholder }) {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId]     = useState(null)
  const [name, setName]         = useState('')
  const [nameEn, setNameEn]     = useState('')
  const queryClient = useQueryClient()
  const showToast   = useUiStore((s) => s.showToast)

  const { data, isLoading } = useQuery({ queryKey: [queryKey], queryFn: fetchFn })

  const createMut = useMutation({
    mutationFn: (d) => createFn(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [queryKey] }); queryClient.invalidateQueries({ queryKey: ['admin-stats'] }); queryClient.invalidateQueries({ queryKey: ['lookups'] }); resetForm(); showToast(`تم إضافة ${noun}`, 'success') },
    onError: (e) => showToast(e.message, 'error'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateFn(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [queryKey] }); queryClient.invalidateQueries({ queryKey: ['lookups'] }); resetForm(); showToast('تم التحديث', 'success') },
    onError: (e) => showToast(e.message, 'error'),
  })

  const resetForm = () => { setShowForm(false); setEditId(null); setName(''); setNameEn('') }
  const startEdit = (item) => { setEditId(item.id); setShowForm(false); setName(item.name); setNameEn(item.name_en || '') }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = { name, name_en: nameEn || undefined }
    if (editId) updateMut.mutate({ id: editId, data: payload })
    else createMut.mutate(payload)
  }

  const items = data?.data || []
  const active = items.filter((i) => i.is_active)
  const inactive = items.filter((i) => !i.is_active)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-ink-soft text-sm">
          {active.length} نشط
          {inactive.length > 0 && <span className="text-ink-faint"> · {inactive.length} معطّل</span>}
        </p>
        {!editId && (
          <button type="button" className="btn-primary !py-1.5 !px-4 text-[13px]"
            onClick={() => { setShowForm(!showForm); setEditId(null) }}>
            {showForm ? 'إلغاء' : `+ ${noun} جديد`}
          </button>
        )}
      </div>

      {(showForm || editId !== null) && (
        <form className="card space-y-3 max-w-sm" onSubmit={handleSubmit}>
          <h4 className="font-medium text-ink text-sm">{editId ? `تعديل ${noun}` : `${noun} جديد`}</h4>
          <div>
            <label className="label text-xs">الاسم بالعربية *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={namePlaceholder} required />
          </div>
          <div>
            <label className="label text-xs">الاسم بالإنجليزية</label>
            <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="English name" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-xs !py-1.5" disabled={createMut.isPending || updateMut.isPending}>
              {editId ? 'حفظ' : 'إضافة'}
            </button>
            <button type="button" className="btn-secondary text-xs !py-1.5" onClick={resetForm}>إلغاء</button>
          </div>
        </form>
      )}

      {isLoading ? <p className="text-ink-faint text-sm">جاري التحميل...</p> : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['الاسم', 'الإنجليزية', 'الحالة', ''].map((h) => (
                  <th key={h} className="text-right py-3 px-4 text-xs text-ink-faint font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    className={`hover:bg-white/[0.02] transition-colors ${!item.is_active ? 'opacity-40' : ''}`}>
                  <td className="py-3 px-4 text-ink font-medium">{item.name}</td>
                  <td className="py-3 px-4 text-ink-faint text-xs font-mono">{item.name_en || '—'}</td>
                  <td className="py-3 px-4">
                    <Toggle
                      checked={!!item.is_active}
                      onChange={(v) => updateMut.mutate({ id: item.id, data: { is_active: v } })}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <button type="button" onClick={() => startEdit(item)}
                      className="text-xs text-accent hover:text-accent-hover transition-colors">تعديل</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ─────────────── تبويب سجل النشاط ─────────────── */
function AuditTab() {
  const [filters, setFilters] = useState({ action: '', entity: '', from: '', to: '' })
  const [page, setPage] = useState(0)
  const limit = 30

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', filters, page],
    queryFn: () => adminApi.auditLog({ ...filters, limit, offset: page * limit }),
  })

  const { data: usersRes } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() })
  const users = usersRes?.data || []

  const rows  = data?.data || []
  const total = data?.meta?.total || 0

  const setF = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(0) }

  return (
    <div className="space-y-4">
      {/* فلاتر */}
      <div className="flex flex-wrap gap-3">
        <select value={filters.action} onChange={(e) => setF('action', e.target.value)} className="text-sm !py-1.5 w-36">
          <option value="">كل الإجراءات</option>
          {Object.entries(ACTION_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filters.entity} onChange={(e) => setF('entity', e.target.value)} className="text-sm !py-1.5 w-32">
          <option value="">كل الجهات</option>
          {Object.entries(ENTITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="date" value={filters.from} onChange={(e) => setF('from', e.target.value)} className="text-sm !py-1.5 w-38" />
        <input type="date" value={filters.to}   onChange={(e) => setF('to',   e.target.value)} className="text-sm !py-1.5 w-38" />
        {(filters.action || filters.entity || filters.from || filters.to) && (
          <button type="button" className="btn-secondary text-xs !py-1.5"
            onClick={() => { setFilters({ action: '', entity: '', from: '', to: '' }); setPage(0) }}>
            مسح
          </button>
        )}
      </div>

      {isLoading ? <p className="text-ink-faint text-sm">جاري التحميل...</p> : rows.length === 0 ? (
        <div className="card text-center py-12 text-ink-faint text-sm">لا يوجد نشاط مسجّل</div>
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['الوقت', 'المستخدم', 'الإجراء', 'الجهة', 'ID', ''].map((h) => (
                  <th key={h} className="text-right py-3 px-4 text-xs text-ink-faint font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const am = ACTION_META[r.action] || { label: r.action, color: '#8891a8' }
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      className="hover:bg-white/[0.015] transition-colors">
                    <td className="py-2.5 px-4 text-ink-faint text-xs whitespace-nowrap">{r.created_at?.replace('T', ' ').slice(0, 16)}</td>
                    <td className="py-2.5 px-4 text-ink text-xs">{r.user_name || '—'}</td>
                    <td className="py-2.5 px-4">
                      <span className="pill text-[11px]" style={{ background: am.color + '18', color: am.color, border: `1px solid ${am.color}30` }}>
                        {am.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-ink-soft text-xs">{ENTITY_LABEL[r.entity] || r.entity}</td>
                    <td className="py-2.5 px-4 text-ink-faint font-mono text-xs">{r.entity_id || '—'}</td>
                    <td className="py-2.5 px-4 text-ink-faint text-xs">{r.ip_address || ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ترقيم الصفحات */}
      {total > limit && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-faint text-xs">{total} سجل إجمالي</span>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary !py-1 !px-3 text-xs" disabled={page === 0} onClick={() => setPage(page - 1)}>‹ السابق</button>
            <span className="text-ink-faint text-xs self-center">صفحة {page + 1}</span>
            <button type="button" className="btn-secondary !py-1 !px-3 text-xs" disabled={(page + 1) * limit >= total} onClick={() => setPage(page + 1)}>التالي ›</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────── الصفحة الرئيسية ─────────────── */
export default function AdminPage() {
  const [tab, setTab] = useState('settings')

  const { data: statsRes } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.stats(),
    refetchInterval: 30_000,
  })
  const stats = statsRes?.data || {}

  const TABS = [
    { id: 'settings', icon: '⚙️', label: 'إعدادات التطبيق' },
    { id: 'users',   icon: '👥', label: 'المستخدمون',      count: stats.users },
    { id: 'borders', icon: '🛂', label: 'المعابر',          count: stats.borders },
    { id: 'goods',   icon: '📦', label: 'أنواع البضائع',   count: stats.goods_types },
    { id: 'sources', icon: '📍', label: 'المصادر' },
    { id: 'destinations', icon: '🏁', label: 'الوجهات' },
    { id: 'audit',   icon: '📋', label: 'سجل النشاط',      count: stats.recent_activity !== undefined ? `${stats.recent_activity} (7 أيام)` : undefined },
  ]

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div>
        <h2 className="text-xl font-bold text-ink">لوحة الإدارة</h2>
        <p className="text-ink-soft text-sm mt-1">إعدادات النظام والمتابعة — للمشرف فقط</p>
      </div>

      {/* بطاقات الإحصاء */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'مستخدمون', value: stats.users,           icon: '👥', tone: 'tone-blue' },
          { label: 'معابر',    value: stats.borders,         icon: '🛂', tone: 'tone-green' },
          { label: 'أنواع بضائع', value: stats.goods_types,  icon: '📦', tone: 'tone-gold' },
          { label: 'نشاط (7 أيام)', value: stats.recent_activity, icon: '📋', tone: 'tone-amber' },
        ].map(({ label, value, icon, tone }) => (
          <div key={label} className={`stat-card ${tone}`}>
            <div className="text-lg mb-2 opacity-75">{icon}</div>
            <p className="text-[10px] text-ink-faint mb-1">{label}</p>
            <p className="text-2xl font-bold text-ink">{value ?? '—'}</p>
          </div>
        ))}
      </div>

      {/* شريط التبويبات */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Tab key={t.id} id={t.id} active={tab === t.id} onClick={setTab} icon={t.icon} count={t.count}>
            {t.label}
          </Tab>
        ))}
      </div>

      {/* محتوى التبويب */}
      <div>
        {tab === 'settings' && <AdminSettingsTab />}

        {tab === 'users' && <UsersTab stats={stats} />}

        {tab === 'borders' && (
          <LookupTab
            queryKey="admin-borders"
            fetchFn={() => adminApi.listBorders()}
            createFn={(d) => adminApi.createBorder(d)}
            updateFn={(id, d) => adminApi.updateBorder(id, d)}
            noun="معبر"
            namePlaceholder="باب الهوى، جرابلس..."
          />
        )}

        {tab === 'goods' && (
          <LookupTab
            queryKey="admin-goods"
            fetchFn={() => adminApi.listGoodsTypes()}
            createFn={(d) => adminApi.createGoodsType(d)}
            updateFn={(id, d) => adminApi.updateGoodsType(id, d)}
            noun="نوع بضاعة"
            namePlaceholder="خضار، فواكه، مواد غذائية..."
          />
        )}

        {tab === 'sources' && (
          <LookupTab
            queryKey="admin-sources"
            fetchFn={() => adminApi.listSources()}
            createFn={(d) => adminApi.createSource(d)}
            updateFn={(id, d) => adminApi.updateSource(id, d)}
            noun="مصدر"
            namePlaceholder="مرسين، غازي عنتاب..."
          />
        )}

        {tab === 'destinations' && (
          <LookupTab
            queryKey="admin-destinations"
            fetchFn={() => adminApi.listDestinations()}
            createFn={(d) => adminApi.createDestination(d)}
            updateFn={(id, d) => adminApi.updateDestination(id, d)}
            noun="وجهة"
            namePlaceholder="حلب، إدلب، دمشق..."
          />
        )}

        {tab === 'audit' && <AuditTab />}
      </div>
    </div>
  )
}
