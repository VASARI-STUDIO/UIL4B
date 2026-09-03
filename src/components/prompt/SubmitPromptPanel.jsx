import { useState, useRef, useCallback } from 'react'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../../utils/firebase'
import { processImageForUpload } from '../../utils/imageProcessing'
import { uploadCommunityMedia, dataUrlToBlob, extFromDataUrl } from '../../utils/mediaUpload'
import { buildCommunityPromptRecord } from '../../utils/promptSubmission'

// Community-submission form. Fully self-contained — owns its inputs, media
// handling, and the Firestore write. Tells the parent to close on success.
export default function SubmitPromptPanel({ onClose, user, userProfile, toast }) {
  const [submitTitle, setSubmitTitle] = useState('')
  const [submitText, setSubmitText] = useState('')
  const [submitTags, setSubmitTags] = useState('')
  const [submitProfile, setSubmitProfile] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMedia, setSubmitMedia] = useState(null)
  const [submitMediaPreview, setSubmitMediaPreview] = useState(null)
  const submitFileRef = useRef(null)

  const handleSubmitMedia = useCallback(async (file) => {
    if (!file) return
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    if (!isImage && !isVideo) { toast('Only images and videos are supported'); return }
    if (file.size > 10 * 1024 * 1024) { toast('File must be under 10 MB'); return }
    setSubmitMedia(file)
    if (isImage) {
      // Compress to WebP (SVGs pass through) so the stored demo stays small.
      try {
        const { dataUrl } = await processImageForUpload(file, { maxDimension: 1200, quality: 0.8 })
        setSubmitMediaPreview({ url: dataUrl, type: 'image' })
      } catch (err) {
        toast(err.message || 'Could not process image')
      }
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => setSubmitMediaPreview({ url: e.target.result, type: 'video' })
    reader.readAsDataURL(file)
  }, [toast])

  const submitToComm = useCallback(async () => {
    if (!submitText.trim()) { toast('Enter a prompt to submit'); return }
    if (!user) { toast('Sign in to submit prompts'); return }
    setSubmitting(true)
    let mediaDropped = false
    try {
      const doc = buildCommunityPromptRecord({
        user,
        userProfile,
        title: submitTitle,
        text: submitText,
        tags: submitTags,
        profileLink: submitProfile,
      })
      if (submitMediaPreview) {
        doc.mediaType = submitMediaPreview.type
        // Preferred path: upload the processed media to Firebase Storage and
        // store a plain URL (no size cap). If Storage isn't enabled yet the
        // upload throws and we fall back to the legacy base64-in-Firestore
        // path below, so nothing regresses.
        let uploaded = false
        try {
          // Re-encoded images live in submitMediaPreview.url (WebP/SVG); videos
          // keep their original File. Upload a Blob either way.
          const blob =
            submitMediaPreview.type === 'image'
              ? dataUrlToBlob(submitMediaPreview.url)
              : (submitMedia || dataUrlToBlob(submitMediaPreview.url))
          if (blob) {
            const ext =
              submitMediaPreview.type === 'image'
                ? extFromDataUrl(submitMediaPreview.url, 'webp')
                : extFromDataUrl(submitMediaPreview.url, 'mp4')
            doc.mediaUrl = await uploadCommunityMedia(blob, user.uid, ext)
            uploaded = true
          }
        } catch {
          // fall through to base64 fallback
        }
        if (!uploaded) {
          // Legacy fallback: inline base64, keeping the existing 900KB guard.
          const withinLimit = submitMediaPreview.url.length < 900_000
          doc.mediaUrl = withinLimit ? submitMediaPreview.url : ''
          mediaDropped = !withinLimit
        }
      }
      await addDoc(collection(db, 'community-prompts'), doc)
      toast('Prompt submitted for review — you\'ll get +25 AI generations if approved!')
      if (mediaDropped) toast('Your image was too large to attach (after compression) — the prompt was submitted without it')
      setSubmitTitle('')
      setSubmitText('')
      setSubmitTags('')
      setSubmitProfile('')
      setSubmitMedia(null)
      setSubmitMediaPreview(null)
      if (submitFileRef.current) submitFileRef.current.value = ''
      onClose()
    } catch {
      toast('Failed to submit — try again')
    } finally {
      setSubmitting(false)
    }
  }, [submitTitle, submitText, submitTags, submitProfile, submitMedia, submitMediaPreview, user, userProfile, toast, onClose])

  return (
    <div className="pl-add-panel open">
      <div className="pl-add-inner">
        <div className="pl-add-fields">
          <div
            className={`pl-drop-zone${submitMedia ? ' has-file' : ''}`}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleSubmitMedia(e.dataTransfer?.files?.[0]) }}
            onClick={() => submitFileRef.current?.click()}
            style={{ marginBottom: 8 }}
          >
            {submitMediaPreview ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {submitMediaPreview.type === 'image' ? (
                  <img src={submitMediaPreview.url} alt="Preview" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{submitMedia?.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--t2)' }}>{submitMediaPreview.type === 'image' ? 'Image' : 'Video'} · {(submitMedia?.size / 1024).toFixed(0)} KB</div>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); setSubmitMedia(null); setSubmitMediaPreview(null) }}
                  style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 6px' }}
                >&times;</button>
              </div>
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                </svg>
                <span>Drop an image or video here (optional, max 10 MB)</span>
              </>
            )}
            <input ref={submitFileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }}
              onChange={e => handleSubmitMedia(e.target.files?.[0])} />
          </div>
          <input type="text" value={submitTitle} onChange={e => setSubmitTitle(e.target.value)} placeholder="Prompt title" className="pl-input-title" />
          <textarea value={submitText} onChange={e => setSubmitText(e.target.value)} placeholder="Your prompt..." className="pl-textarea" />
          <input type="text" value={submitTags} onChange={e => setSubmitTags(e.target.value)} placeholder="Tags (comma separated)" />
          <input type="url" value={submitProfile} onChange={e => setSubmitProfile(e.target.value)} placeholder="Your profile link (optional — portfolio, X, Dribbble)" />
        </div>
        <div className="pl-add-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" onClick={submitToComm} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit for review'}
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 8 }}>
          Submissions are reviewed before appearing in the community library. Approved prompts earn you <strong style={{ color: 'var(--accent-strong)' }}>+25 bonus AI generations</strong>.
        </div>
      </div>
    </div>
  )
}
