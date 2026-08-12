import { useCallback, useMemo, useState } from 'react'
import { useSubscription } from '../contexts/SubscriptionContext'
import { AI_LIMITS } from '../config/plans'
import { getUsageCount } from '../utils/usageTracker'
import { quotaState, quotaMessage } from '../utils/aiQuota'

// Shared AI-allowance state for the tools that call /api/ai.
//
// The arithmetic lives in utils/aiQuota.js (DOM-free, tested); this only wires
// it to the plan and to whatever the server last said. Every AI response —
// success OR 429 — carries a `usage` object, and until now not one caller read
// it. Pass responses through `absorb` and the meter becomes truthful instead of
// a localStorage guess about one browser.
export function useAiQuota(toolId) {
  const { plan } = useSubscription()
  const [server, setServer] = useState(null)
  // localStorage is not reactive, so the count is snapshotted into state on
  // mount and re-read whenever a response lands (recordUsage writes to it
  // directly, just before absorb is called).
  const [localUsed, setLocalUsed] = useState(() => getUsageCount(toolId))

  const dailyLimit = plan?.limits?.[toolId] ?? AI_LIMITS.free.daily
  const monthlyLimit = plan?.monthlyLimits?.[toolId] ?? AI_LIMITS.free.monthly

  const state = useMemo(
    () => quotaState({ server, localUsed, dailyLimit, monthlyLimit }),
    [server, localUsed, dailyLimit, monthlyLimit],
  )

  // Feed any /api/ai response body through this. Safe to call with anything —
  // a network failure has no usage object and must not blank a known figure.
  const absorb = useCallback((data) => {
    if (data?.usage && typeof data.usage === 'object') setServer(data.usage)
    setLocalUsed(getUsageCount(toolId))
  }, [toolId])

  return { ...state, message: quotaMessage(state), absorb, dailyLimit, monthlyLimit }
}
