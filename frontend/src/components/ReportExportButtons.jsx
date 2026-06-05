import { useState } from 'react'
import { useUiStore } from '../store/auth.store'
import { downloadBlob } from '../utils/download'

/** أزرار تصدير Excel / PDF — يستدعي دالة جلب blob */
export default function ReportExportButtons({
  fetchBlob,
  filenameBase,
  disabled,
  xlsxLabel = '⬇ Excel',
  pdfLabel = '⬇ PDF',
}) {
  const showToast = useUiStore((s) => s.showToast)
  const [busy, setBusy] = useState('')

  const download = async (fmt) => {
    setBusy(fmt)
    try {
      const blob = await fetchBlob(fmt)
      downloadBlob(blob, `${filenameBase}.${fmt === 'xlsx' ? 'xlsx' : 'pdf'}`)
      showToast(`تم تنزيل ${fmt === 'xlsx' ? 'Excel' : 'PDF'}`, 'success')
    } catch (e) {
      showToast(e.message || 'تعذّر التصدير', 'error')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <button
        type="button"
        className="btn-success !py-1.5 !px-3 text-xs"
        disabled={disabled || !!busy}
        onClick={() => download('xlsx')}
      >
        {busy === 'xlsx' ? '...' : xlsxLabel}
      </button>
      <button
        type="button"
        className="btn-danger !py-1.5 !px-3 text-xs"
        disabled={disabled || !!busy}
        onClick={() => download('pdf')}
      >
        {busy === 'pdf' ? '...' : pdfLabel}
      </button>
    </div>
  )
}
