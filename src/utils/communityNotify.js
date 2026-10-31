// Tells the server that the signed-in user has just published to the community
// queue, so it can count the post towards the admin's "email me" setting
// (api/_lib/communityNotify.js). The server checks the document itself; this
// sends only which one.
import { auth } from './firebase'

/**
 * Fire and forget. The post is already saved by the time this runs, so nothing
 * here may delay it, fail it or show the user anything: every error is dropped
 * and the result is never read.
 */
export function notifyCommunityPost(collection, id) {
  ;(async () => {
    const token = await auth.currentUser?.getIdToken()
    if (!token) return
    await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type: 'community-submission', collection, id }),
      keepalive: true,
    })
  })().catch(() => {})
}
