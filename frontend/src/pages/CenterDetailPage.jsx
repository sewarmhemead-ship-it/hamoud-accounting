import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { centersApi, reportsApi, transactionsApi } from '../api'
import BalanceCard from '../components/BalanceCard'
import CenterBalancePanel from '../components/CenterBalancePanel'
import PageHeader from '../components/PageHeader'
import { formatCurrency, formatDate, todayISO } from '../utils/format'
import { waLink, buildReminderText, toWaNumber } from '../utils/whatsapp'
import { useUiStore } from '../store/auth.store'

export default function CenterDetailPage() {
  const { id } = useParams()
  const [showPayment, setShowPayment] = useState(false)
  const [payment, setPayment] = useState({ amount: '', currency: 'USD', exchange_rate: '', date: todayISO(), notes: '' })
  const [whatsappText, setWhatsappText] = useState(null)
  const [editPhone, setEditPhone] = useState(false)
  const [phoneVal, setPhoneVal] = useState('')
  const queryClient = useQueryClient()
  const showToast = useUiStore((s) => s.showToast)

  const { data: centerRes } = useQuery({
    queryKey: ['center', id],
    queryFn: () => centersApi.get(id),
  })

  const { data: balanceRes } = useQuery({
    queryKey: ['balance', id],
    queryFn: () => centersApi.balance(id),
  })

  const { data: statementRes } = useQuery({
    queryKey: ['statement', id],
    queryFn: () => centersApi.statement(id, { limit: 30 }),
  })

  // نص كشف واتساب جاهز مسبقاً (ليكون رابط wa.me فورياً دون حظر النوافذ)
  const { data: waRes } = useQuery({
    queryKey: ['whatsapp-text', id],
    queryFn: () => reportsApi.whatsapp(id),
  })
  const waText = waRes?.data?.text || ''

  const phoneMutation = useMutation({
    mutationFn: (phone) => centersApi.update(id, { phone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['center', id] })
      setEditPhone(false)
      showToast('تم حفظ رقم الواتساب', 'success')
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  const paymentMutation = useMutation({
    mutationFn: (data) =>
      transactionsApi.createPayment({ ...data, center_id: parseInt(id, 10) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance', id] })
      queryClient.invalidateQueries({ queryKey: ['statement', id] })
      setShowPayment(false)
      setPayment({ amount: '', currency: 'USD', exchange_rate: '', date: todayISO(), notes: '' })
      showToast('تم تسجيل الدفعة', 'success')
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  const center = centerRes?.data
  const bal = balanceRes?.data
  const transactions = statementRes?.data?.transactions || []

  const loadWhatsapp = async () => {
    try {
      const res = await reportsApi.whatsapp(id)
      setWhatsappText(res.data.text)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  if (!center) return <p className="text-ink-soft">جاري التحميل...</p>

  return (
    <div className="space-y-6">
      <PageHeader
        title={center.name}
        subtitle={`مركز ${center.code} — ${center.type}`}
        actions={
          <>
            <button type="button" className="btn-primary" onClick={() => setShowPayment(!showPayment)}>
              + دفعة
            </button>
            <button type="button" className="btn-secondary" onClick={loadWhatsapp}>
              واتساب
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <CenterBalancePanel balance={bal} />
          <Link to="/inventory" className="text-sm text-accent font-semibold hover:underline inline-block">
            عرض هذا المركز في الجرد الدوري ←
          </Link>
        </div>
        {bal && (
          <div className="grid grid-cols-2 gap-3">
            <BalanceCard title="صادر (out)" value={bal.total_out} variant="danger" />
            <BalanceCard title="وارد (in)" value={bal.total_in} variant="positive" />
          </div>
        )}
      </div>

      {/* ─── واتساب ─── */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-ink">📲 واتساب</h3>
          {!editPhone && (
            <button
              type="button"
              className="text-xs text-accent hover:underline"
              onClick={() => { setPhoneVal(center.phone || ''); setEditPhone(true) }}
            >
              {center.phone ? 'تعديل الرقم' : '+ إضافة رقم'}
            </button>
          )}
        </div>

        {editPhone ? (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={phoneVal}
              onChange={(e) => setPhoneVal(e.target.value)}
              placeholder="مع رمز الدولة: 963944123456"
              dir="ltr"
              className="w-60"
            />
            <button
              type="button"
              className="btn-success !py-1.5 !px-3 text-xs"
              onClick={() => phoneMutation.mutate(phoneVal.trim())}
              disabled={phoneMutation.isPending}
            >
              حفظ
            </button>
            <button type="button" className="btn-secondary !py-1.5 !px-3 text-xs" onClick={() => setEditPhone(false)}>
              إلغاء
            </button>
          </div>
        ) : center.phone ? (
          <p className="text-sm text-ink-soft" dir="ltr">📞 {center.phone}</p>
        ) : (
          <p className="text-sm text-ink-faint">لا يوجد رقم — أضف رقماً لإرسال الكشف والتذكير عبر واتساب</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={waLink(center.phone, waText)}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn-success !py-1.5 !px-3 text-sm ${!waText ? 'pointer-events-none opacity-50' : ''}`}
          >
            📲 إرسال الكشف
          </a>
          <a
            href={waLink(center.phone, buildReminderText(center, bal))}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary !py-1.5 !px-3 text-sm"
          >
            📲 تذكير بالرصيد
          </a>
          {!center.phone && (
            <span className="text-xs text-ink-faint">بدون رقم سيفتح واتساب لتختار المستلم يدوياً</span>
          )}
        </div>
      </div>

      {showPayment && (
        <form
          className="card space-y-4 max-w-md"
          onSubmit={(e) => {
            e.preventDefault()
            paymentMutation.mutate({
              ...payment,
              amount: parseFloat(payment.amount),
              exchange_rate: payment.currency !== 'USD' && payment.exchange_rate ? parseFloat(payment.exchange_rate) : 1,
            })
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">المبلغ *</label>
              <input
                type="number"
                step="0.01"
                value={payment.amount}
                onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">العملة</label>
              <select value={payment.currency} onChange={(e) => setPayment({ ...payment, currency: e.target.value })}>
                <option value="USD">دولار $</option>
                <option value="SYP">ليرة سورية</option>
                <option value="TRY">ليرة تركية</option>
              </select>
            </div>
          </div>
          {payment.currency !== 'USD' && (
            <div>
              <label className="label">سعر الصرف مقابل الدولار *</label>
              <input
                type="number"
                step="0.01"
                value={payment.exchange_rate}
                onChange={(e) => setPayment({ ...payment, exchange_rate: e.target.value })}
                placeholder={payment.currency === 'SYP' ? 'مثال: 14500' : 'مثال: 32'}
                required
              />
            </div>
          )}
          <div>
            <label className="label">التاريخ</label>
            <input
              type="date"
              value={payment.date}
              onChange={(e) => setPayment({ ...payment, date: e.target.value })}
            />
          </div>
          <div>
            <label className="label">ملاحظات</label>
            <input
              value={payment.notes}
              onChange={(e) => setPayment({ ...payment, notes: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-success" disabled={paymentMutation.isPending}>
            تسجيل الدفعة
          </button>
        </form>
      )}

      {whatsappText && (
        <div className="card">
          <p className="text-sm text-ink-soft mb-2">انسخ الرسالة:</p>
          <pre className="text-sm text-ink whitespace-pre-wrap bg-surface p-3 rounded-lg">
            {whatsappText}
          </pre>
        </div>
      )}

      <div className="card overflow-x-auto">
        <h3 className="font-semibold text-ink mb-2">كشف الحساب</h3>
        <p className="text-xs text-ink-soft mb-4">مطابق لفراس الشهابي.xlsx — charges + payments في جدول واحد</p>
        <table className="data-table w-full text-xs">
          <thead>
            <tr>
              <th className="text-right py-2 px-1">التاريخ</th>
              <th className="text-right py-2 px-1">بضاعة</th>
              <th className="text-right py-2 px-1">ترسيم</th>
              <th className="text-right py-2 px-1">عمال</th>
              <th className="text-right py-2 px-1">وصل دور</th>
              <th className="text-right py-2 px-1">اتعاب</th>
              <th className="text-right py-2 px-1">سائق سوري</th>
              <th className="text-right py-2 px-1">سائق تركي</th>
              <th className="text-right py-2 px-1">المجموع</th>
              <th className="text-right py-2 px-1">الدفعات</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const isOut = tx.type === 'out'
              const isIn = tx.type === 'in'
              return (
                <tr key={tx.id}>
                  <td className="py-2 px-1 text-ink-soft whitespace-nowrap">{formatDate(tx.date)}</td>
                  <td className="py-2 px-1 text-ink max-w-[120px] truncate">
                    {tx.goods_name || tx.notes?.slice(0, 30) || tx.ref_number}
                  </td>
                  <td className="py-2 px-1 text-ink-soft">{isOut && tx.tarseem ? tx.tarseem : ''}</td>
                  <td className="py-2 px-1 text-ink-soft">{isOut && tx.workers ? tx.workers : ''}</td>
                  <td className="py-2 px-1 text-ink-soft">{isOut && tx.door_receipt ? tx.door_receipt : ''}</td>
                  <td className="py-2 px-1 text-ink-soft">{isOut && tx.clearance_fee ? tx.clearance_fee : ''}</td>
                  <td className="py-2 px-1 text-ink-soft">{isOut && tx.syrian_driver ? tx.syrian_driver : ''}</td>
                  <td className="py-2 px-1 text-ink-soft">{isOut && tx.turkish_transport ? tx.turkish_transport : ''}</td>
                  <td className="py-2 px-1 text-danger font-medium">
                    {isOut ? formatCurrency(tx.amount_usd) : ''}
                  </td>
                  <td className="py-2 px-1 text-success font-medium">
                    {isIn ? formatCurrency(tx.amount_usd) : ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
          {bal && (
            <tfoot>
              <tr className="border-t border-surface-border font-bold">
                <td colSpan={8} className="py-3 px-1 text-ink">الرصيد</td>
                <td className="py-3 px-1 text-accent">{formatCurrency(bal.grand_total)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
