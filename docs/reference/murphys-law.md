# Murphy's Law Checklist

> Reference doc for UIL4B. Linked from `CLAUDE.md`. Anything that can go wrong
> for a real user, will. QA treats missing UX states as a failure.

## Before shipping any feature, consider:

- What happens if the **network is offline**?
- What happens on a **320px screen**? On a **4K screen**?
- What happens if the user **double-clicks**?
- What happens if the **data is empty**? If it has **1000+ items**?
- What happens if **localStorage is full or disabled**?
- What happens if the user **navigates away mid-action**?
- What happens if **Firebase / Stripe / the AI API is down**?

## Required UX states

Every interactive feature must visibly handle all four:

| State | Requirement |
|---|---|
| **Loading** | Show progress; disable the trigger to prevent double-submits. |
| **Empty** | A helpful empty state, never a blank panel. |
| **Error** | A human-readable message + a recovery path (retry / dismiss). |
| **Offline** | Degrade gracefully; never hang or lose the user's input. |

## Resilience expectations

- **External services can fail.** OpenRouter/Gemini/Stripe/Firebase being down
  must not crash the page. Catch, message, and offer a retry or fallback.
- **Double-submit guard.** Disable buttons during async work.
- **localStorage may throw.** Wrap reads/writes in `try/catch` (the codebase
  already does this for `vs-onboarded`, analytics keys, etc.).
- **Responsive down to 320px and up to 4K.** `css-conventions.md` owns the
  breakpoint scale and the widths to test at — read it there rather than from
  this line. It used to name "768 (tablet), 480 (phone), 380 (tiny)", a triple
  that omitted **640px**, the most-used breakpoint in the stylesheet, and never
  mentioned the 641–900px band where this app actually breaks.
- **Mid-action navigation.** Don't leave the app in a broken state if the user
  leaves a flow halfway.
