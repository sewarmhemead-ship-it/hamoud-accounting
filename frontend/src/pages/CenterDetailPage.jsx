import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { centersApi, reportsApi, transactionsApi } from '../api'
import BalanceCard from '../components/BalanceCard'
import CenterBalancePanel from '../components/CenterBalancePanel'
import PageHeader from '../components/PageHeader'
import { formatCurrency, formatDate, todayISO } from '../utils/format'
import { useUiStore } from '../store/auth.store'

export default function CenterDetailPage() {
  const { id } = useParams()
  const [showPayment, setShowPayment] = useState(false)
  const [payment, setPayment] = useState({ amount: '', date: todayISO(), notes: '' })
  const [whatsappText, setWhatsappText] = useState(null)
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

  const paymentMutation = useMutation({
    mutationFn: (data) =>
      transactionsApi.createPayment({ ...data, center_id: parseInt(id, 10) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance', id] })
      queryClient.invalidateQueries({ queryKey: ['statement', id] })
      setShowPayment(false)
      setPayment({ amount: '', date: todayISO(), notes: '' })
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

  if (!center) return <p className="text-gray-500">جاري التحميل...</p>

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
        <div className="lg:col-span-2">
          <CenterBalancePanel balance={bal} />
        </div>
        {bal && (
          <div className="grid grid-cols-2 gap-3">
            <BalanceCard title="صادر (out)" value={bal.total_out} variant="danger" />
            <BalanceCard title="وارد (in)" value={bal.total_in} variant="positive" />
          </div>
        )}
      </div>

      {showPayment && (
        <form
          className="card space-y-4 max-w-md"
          onSubmit={(e) => {
            e.preventDefault()
            paymentMutation.mutate({
              ...payment,
              amount: parseFloat(payment.amount),
            })
          }}
        >
          <div>
            <label className="label">المبلغ $</label>
            <input
              type="number"
              step="0.01"
              value={payment.amount}
              onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
              required
            />
          </div>
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
          <p className="text-sm text-gray-400 mb-2">انسخ الرسالة:</p>
          <pre className="text-sm text-gray-300 whitespace-pre-wrap bg-surface p-3 rounded-lg">
            {whatsappText}
          </pre>
        </div>
      )}

      <div className="card overflow-x-auto">
        <h3 className="font-semibold text-white mb-2">كشف الحساب</h3>
        <p className="text-xs text-gray-500 mb-4">مطابق لفراس الشهابي.xlsx — charges + payments في جدول واحد</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-surface-border">
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
                <tr key={tx.id} className="border-b border-surface-border/50 hover:bg-surface-hover/30">
                  <td className="py-2 px-1 text-gray-400 whitespace-nowrap">{formatDate(tx.date)}</td>
                  <td className="py-2 px-1 text-gray-200 max-w-[120px] truncate">
                    {tx.goods_name || tx.notes?.slice(0, 30) || tx.ref_number}
                  </td>
                  <td className="py-2 px-1 text-gray-400">{isOut && tx.tarseem ? tx.tarseem : ''}</td>
                  <td className="py-2 px-1 text-gray-400">{isOut && tx.workers ? tx.workers : ''}</td>
                  <td className="py-2 px-1 text-gray-400">{isOut && tx.door_receipt ? tx.door_receipt : ''}</td>
                  <td className="py-2 px-1 text-gray-400">{isOut && tx.clearance_fee ? tx.clearance_fee : ''}</td>
                  <td className="py-2 px-1 text-gray-400">{isOut && tx.syrian_driver ? tx.syrian_driver : ''}</td>
                  <td className="py-2 px-1 text-gray-400">{isOut && tx.turkish_transport ? tx.turkish_transport : ''}</td>
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
                <td colSpan={8} className="py-3 px-1 text-gray-300">الرصيد</td>
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
