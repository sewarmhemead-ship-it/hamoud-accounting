import { Navigate, useSearchParams } from 'react-router-dom'

/** إعادة توجيه — دُمجت الدفعات مع المقاصة في /cash */
export default function PaymentsPage() {
  const [params] = useSearchParams()
  const q = params.toString()
  return <Navigate to={q ? `/cash?${q}` : '/cash'} replace />
}
