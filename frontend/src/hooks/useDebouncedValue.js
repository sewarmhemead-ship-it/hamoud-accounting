import { useEffect, useState } from 'react'

/** قيمة متأخرة لتقليل طلبات API أثناء الكتابة في البحث */
export function useDebouncedValue(value, delayMs = 350) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])

  return debounced
}
