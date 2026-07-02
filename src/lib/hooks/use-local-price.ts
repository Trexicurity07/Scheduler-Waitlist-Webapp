'use client'

import { useState, useEffect } from 'react'

type RateState = {
  currency: string
  rate: number
  loading: boolean
}

function roundToNearestNineNinetyNine(price: number): number {
  return Math.ceil(price / 10) * 10 - 0.01
}

const SESSION_KEY = 'sf_local_price'

export function useLocalPrice() {
  const [state, setState] = useState<RateState>({ currency: 'USD', rate: 1, loading: true })

  useEffect(() => {
    const cached = sessionStorage.getItem(SESSION_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as RateState
        setState({ ...parsed, loading: false })
        return
      } catch { /* fall through to fetch */ }
    }

    let cancelled = false
    async function load() {
      try {
        const geoRes = await fetch('https://ipapi.co/json/')
        const geo = await geoRes.json() as { currency?: string }
        const currency = geo.currency ?? 'USD'

        let rate = 1
        if (currency !== 'USD') {
          const rateRes = await fetch('https://open.er-api.com/v6/latest/USD')
          const rateData = await rateRes.json() as { rates?: Record<string, number> }
          rate = rateData.rates?.[currency] ?? 1
        }

        const result: RateState = { currency, rate, loading: false }
        if (!cancelled) {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(result))
          setState(result)
        }
      } catch {
        if (!cancelled) setState({ currency: 'USD', rate: 1, loading: false })
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  function formatPrice(usdAmount: number): string {
    if (usdAmount === 0) return 'Free'
    const converted = usdAmount * state.rate
    const rounded = roundToNearestNineNinetyNine(converted)
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: state.currency,
    }).format(rounded)
  }

  return { formatPrice, currency: state.currency, loading: state.loading }
}
