// In-memory stand-ins for the Admin SDK, used with ./api-stub-loader.mjs.
// No network, no credentials.

/** A response object with the few members the routes use. */
export function fakeRes() {
  return {
    statusCode: 200, headers: {}, body: undefined,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.body = payload; return this },
    setHeader(k, v) { this.headers[k] = v },
    end() { return this },
  }
}

/**
 * An Admin Auth fake. `tokens` maps a bearer string to what verifyIdToken
 * resolves to, or to an Error to throw. Every call is recorded.
 */
export function fakeAuth({ tokens = {}, users = {}, pageSize = 1000, failRevoke = [], failSetClaims = [] } = {}) {
  // `order` is every revoke/claims write in the sequence it happened, as
  // 'revoke:uid' and 'claims:uid'. `failRevoke` and `failSetClaims` list uids
  // whose call throws (and is not recorded as having happened).
  const calls = { verify: [], setClaims: [], revoke: [], order: [] }
  const accounts = new Map(Object.entries(users).map(([uid, u]) => [uid, { uid, customClaims: {}, ...u }]))
  return {
    calls,
    accounts,
    async verifyIdToken(token, checkRevoked) {
      calls.verify.push({ token, checkRevoked })
      const outcome = tokens[token]
      if (outcome instanceof Error) throw outcome
      if (!outcome) throw Object.assign(new Error('bad token'), { code: 'auth/argument-error' })
      return outcome
    },
    async getUser(uid) {
      const u = accounts.get(uid)
      if (!u) throw new Error(`no user ${uid}`)
      return { ...u, customClaims: { ...u.customClaims } }
    },
    async setCustomUserClaims(uid, claims) {
      if (failSetClaims.includes(uid)) throw new Error(`setCustomUserClaims failed for ${uid}`)
      calls.setClaims.push({ uid, claims: { ...claims } })
      calls.order.push(`claims:${uid}`)
      accounts.get(uid).customClaims = { ...claims }
    },
    async revokeRefreshTokens(uid) {
      if (failRevoke.includes(uid)) throw new Error(`revokeRefreshTokens failed for ${uid}`)
      calls.revoke.push(uid)
      calls.order.push(`revoke:${uid}`)
    },
    // Paged by `pageSize`, so a sweep's pagination is exercised.
    async listUsers(_max, pageToken) {
      const all = [...accounts.values()]
      const start = pageToken ? Number(pageToken) : 0
      const end = start + pageSize
      return { users: all.slice(start, end).map((u) => ({ ...u, customClaims: { ...u.customClaims } })), pageToken: end < all.length ? String(end) : undefined }
    },
  }
}

/** The error Firebase throws for a token whose sessions were revoked. */
export const revokedError = () => Object.assign(new Error('The Firebase ID token has been revoked.'), { code: 'auth/id-token-revoked' })

/**
 * An in-memory Firestore: documents, `add`, and the transaction shape
 * api/_lib/rateLimit.js uses.
 */
export function fakeDb(seed = {}) {
  const docs = new Map(Object.entries(seed))
  let autoId = 0
  const ref = (col, id) => ({
    path: `${col}/${id}`,
    async get() {
      const data = docs.get(`${col}/${id}`)
      return { exists: data !== undefined, data: () => data }
    },
    async set(data, opts) {
      const key = `${col}/${id}`
      docs.set(key, opts?.merge ? { ...(docs.get(key) || {}), ...data } : { ...data })
    },
  })
  return {
    docs,
    inCollection: (col) => [...docs.entries()].filter(([k]) => k.startsWith(`${col}/`)).map(([, v]) => v),
    collection: (col) => ({
      // `doc()` with no id makes a fresh document, as the Admin SDK does.
      doc: (id) => ref(col, id ?? `auto${(autoId += 1)}`),
      async add(data) {
        autoId += 1
        docs.set(`${col}/auto${autoId}`, { ...data })
        return { id: `auto${autoId}` }
      },
    }),
    async runTransaction(fn) {
      return fn({
        get: (r) => r.get(),
        set: (r, data, opts) => r.set(data, opts),
      })
    },
  }
}

/** Point the stub loader's modules at these fakes. */
export function install({ auth, db, stripe, credentialProblem = null } = {}) {
  globalThis.__FB__ = { auth, db, credentialProblem }
  globalThis.__STRIPE__ = stripe
}
