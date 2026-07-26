import { getOwnerHandle, PUBLIC_OWNER_ID } from './constants'
import { safeHttpUrl } from './urlSafety'

export function resolvePromptProfileLink(prompt) {
  return safeHttpUrl(prompt?.profileLink) || safeHttpUrl(prompt?.authorProfile)
}

export function buildCommunityPromptRecord({
  user,
  userProfile,
  title,
  text,
  tags,
  profileLink,
  createdAt = new Date().toISOString(),
}) {
  const owner = getOwnerHandle(user?.email)
  return {
    title: title.trim() || text.trim().slice(0, 60),
    text: text.trim(),
    tags: tags.trim(),
    authorName: owner?.publicHandle || userProfile?.displayName || user?.displayName || 'Community member',
    authorUid: user.uid,
    ...(owner ? { ownerId: PUBLIC_OWNER_ID } : {}),
    profileLink: safeHttpUrl(profileLink) || null,
    status: 'pending',
    createdAt,
  }
}
