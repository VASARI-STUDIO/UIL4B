const CANCELLED_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
])

const POPUP_BLOCKED_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
])

export function accountProviderIds(account) {
  const candidates = [
    ...(Array.isArray(account?.providerIds) ? account.providerIds : []),
    ...(Array.isArray(account?.providers) ? account.providers : []),
    ...(Array.isArray(account?.providerData)
      ? account.providerData.map((entry) => entry?.providerId)
      : []),
    account?.provider,
  ]
  const providerIds = [...new Set(candidates.filter((value) => typeof value === 'string' && value))]
  return providerIds.length ? providerIds : ['password']
}

export function authSwitchOutcome(value, details = {}) {
  if (typeof value === 'string') {
    return { outcome: value, code: value, ...details }
  }
  const firebaseCode = value?.code || 'auth/account-switch-failed'
  if (CANCELLED_CODES.has(firebaseCode)) {
    return { outcome: 'cancelled', code: 'cancelled', firebaseCode, ...details }
  }
  if (POPUP_BLOCKED_CODES.has(firebaseCode)) {
    return { outcome: 'popupBlocked', code: 'popupBlocked', firebaseCode, ...details }
  }
  return {
    outcome: 'error',
    code: 'error',
    firebaseCode,
    message: value?.message || 'Could not switch accounts. Your current session is still active.',
    ...details,
  }
}

export function accountSelectionOutcome(credential, targetUid) {
  const user = credential?.user || null
  if (user?.uid && user.uid === targetUid) {
    return authSwitchOutcome('switched', { credential, user })
  }
  return authSwitchOutcome('selectedDifferentAccount', {
    credential,
    user,
    actualUser: user ? {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
    } : null,
  })
}

export function isCurrentAuthSession(epochRef, expectedEpoch, expectedUid, currentUser) {
  return epochRef?.current === expectedEpoch && currentUser?.uid === expectedUid
}
