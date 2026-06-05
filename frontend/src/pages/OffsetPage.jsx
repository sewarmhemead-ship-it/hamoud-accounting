import { Navigate } from 'react-router-dom'

/** إعادة توجيه — دُمجت المقاصة مع الدفعات في /cash */
export default function OffsetPage() {
  return <Navigate to="/cash?mode=offset" replace />
}
