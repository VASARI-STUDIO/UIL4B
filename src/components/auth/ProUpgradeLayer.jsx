import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import useModalDialog from '../../hooks/useModalDialog'
import { usePriceRetry, usePrices, useProPrice } from '../../hooks/usePrices'
import { formatMoney } from '../../config/planLadder'
import {
  DEFAULT_BILLING, canCheckout, perMonth, priceState, priceStateCopy, resolveOffers,
} from '../../config/planFacts'
import { readPick } from '../../utils/kitGalleryPick'
import { beginProSignup, endProSignup } from '../../utils/proSignupFlow'
import AuthForm from './AuthForm'
import ProWall from './ProWall'

// The full-screen Pro sign-up layer over /plans. Steps (Account, Password, Plan)
// each hold one `?up=` history entry, so Back steps back and then closes. The
// route never changes while it is open; the page beneath is `inert`.

const SEG_KEYS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

const BackArrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
)

function PlanStep({ cadence, onCadence, account, onDone, onKeep }) {
  const { t } = useI18n()
  const price = useProPrice()
  const { prices } = usePrices()
  const { retrying, retry } = usePriceRetry()
  const { offers } = resolveOffers({ prices, currency: price.currency, loaded: price.loaded })
  const offer = offers.find((o) => o.id === cadence) || offers[0]
  const state = priceState({ price, offers, selectedId: offer.id, retrying })
  const live = canCheckout(state)
  const other = offers.find((o) => o.id !== offer.id && o.amountLabel)
  const copy = priceStateCopy(state, { currencyLabel: price.currencyLabel, selectedLabel: offer.label, otherLabel: other?.label })
  const money = (n) => formatMoney(n, price.currency, { qualify: true })
  const waiting = state === 'loading' || state === 'retrying'
  const titleRef = useRef(null)
  const segRefs = useRef({})
  useEffect(() => { titleRef.current?.focus() }, [])

  const unit = offer.months === 12 ? 'year' : 'month'
  const noTrial = offers.find((o) => !o.trialDays)
  const best = offers.find((o) => o.id === DEFAULT_BILLING)
  let line1
  let line2 = ''
  if (live) {
    line1 = offer.trialDays
      ? t('auth.proAuth.freeThen', { days: offer.trialDays, total: money(offer.total), unit })
      : t('auth.proAuth.billedMonthly', { label: offer.label })
    if (offer.trialDays && noTrial?.total != null) line2 = t('auth.proAuth.monthlyNoTrial', { total: money(noTrial.total) })
    else if (!offer.trialDays && best?.total != null && best.id !== offer.id) {
      line2 = t('auth.proAuth.worksOut', { label: best.label, amount: money(perMonth(best.total, best.months)) })
    }
  } else {
    line1 = copy.line1 || ''
    line2 = copy.line2 || ''
  }

  const onKey = (event, index) => {
    const step = SEG_KEYS[event.key]
    if (!step) return
    event.preventDefault()
    const next = offers[(index + step + offers.length) % offers.length]
    onCadence(next.id)
    segRefs.current[next.id]?.focus()
  }

  const go = () => {
    if (live) { onDone(offer); return }
    if (waiting) return
    if (state === 'cadence-missing' && other) { onCadence(other.id); return }
    retry()
  }
  const showAction = state !== 'no-currency'
  const actionLabel = live
    ? (offer.trialDays ? t('auth.proAuth.startTrial', { days: offer.trialDays }) : t('auth.proAuth.upgrade'))
    : (waiting ? (copy.button || t('auth.proAuth.upgrade')) : copy.button)

  return (
    <div className="auth-form-root pl-root" data-step="3">
      <h2 className="auth-title" id="pro-layer-title" ref={titleRef} tabIndex={-1}>{t('auth.proAuth.planTitle')}</h2>
      {account?.email && <p className="auth-sub">{t('auth.proAuth.loggedInAs', { email: account.email })}</p>}
      <div className="pl-seg" role="radiogroup" aria-label={t('auth.proAuth.cadence')}>
        {offers.map((o, i) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            className="pl-seg-btn"
            aria-checked={o.id === offer.id}
            tabIndex={o.id === offer.id ? 0 : -1}
            ref={(el) => { segRefs.current[o.id] = el }}
            onClick={() => onCadence(o.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {o.savingLabel ? t('auth.proAuth.yearlySave', { saving: o.savingLabel }) : o.label}
          </button>
        ))}
      </div>
      {live && (
        <p className="pl-fig">
          <span className="pl-fig-n">{money(offer.total)}</span>
          <span className="pl-fig-u">{'a ' + unit}</span>
        </p>
      )}
      <div className="pl-lines" aria-live="polite">
        {line1 && <p>{line1}</p>}
        {line2 && <p>{line2}</p>}
      </div>
      {showAction && (
        <button
          type="button"
          className="pl-go"
          aria-disabled={waiting ? 'true' : undefined}
          aria-busy={state === 'retrying' ? 'true' : undefined}
          onClick={go}
        >
          {actionLabel}
        </button>
      )}
      {live && <p className="pl-fine">{t('auth.proAuth.stripe')}</p>}
      <button type="button" className="pl-keep" onClick={onKeep}>{t('auth.proAuth.keepFree')}</button>
    </div>
  )
}

export default function ProUpgradeLayer({ step, leaving, cadence, onCadence, onStep, onClose, onSignedIn, account }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { loading } = useAuth()
  const [mode, setMode] = useState('signup')
  const ctl = useRef(null)
  const back = () => { if (!ctl.current?.back?.()) onClose() }
  const dialogRef = useModalDialog(back)
  useEffect(() => { beginProSignup(); return endProSignup }, [])

  const handOff = (offer) => {
    const from = readPick() ? '&from=kit-gallery' : ''
    navigate('/checkout?plan=' + offer.checkoutPlan + from, { replace: true })
  }

  return (
    <div
      className="pf pf--layer"
      role="dialog"
      aria-modal="true"
      aria-labelledby={step === 3 ? 'pro-layer-title' : 'ui-login-title'}
      tabIndex={-1}
      ref={dialogRef}
      data-pro-layer
      data-step={step}
      data-leaving={leaving ? 'true' : undefined}
    >
      <h2 className="pf-h">{t('auth.proAuth.wallLabel')}</h2>
      <header className="pf-bar">
        <button type="button" className="pf-back" onClick={back}>
          <BackArrow />{step === 2 ? t('auth.back') : t('auth.backToPlans')}
        </button>
        <p className="pf-step">{t('auth.stepOf', { n: step })}</p>
      </header>
      <div className="pf-strip"><ProWall variant="strip" /></div>
      <main className="pf-main">
        <div className="pf-col">
          {step === 3 ? (
            <PlanStep cadence={cadence} onCadence={onCadence} account={account} onDone={handOff} onKeep={onClose} />
          ) : loading ? (
            <p className="pf-checking" role="status" aria-busy="true" />
          ) : (
            <AuthForm
              mode={mode}
              onModeChange={setMode}
              step={step}
              onStepChange={onStep}
              controlRef={ctl}
              showReport
              heading={t('auth.proAuth.title')}
              loginHeading={t('auth.proAuth.loginTitle')}
              subtitle={t('auth.proAuth.sub')}
              showLoginSub
              onSuccess={onSignedIn}
            />
          )}
        </div>
      </main>
      <aside className="pf-wall"><ProWall /></aside>
    </div>
  )
}
