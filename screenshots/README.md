# `screenshots/` — portfolio assets, not build output

**ARCHIVED 2026-09-14, on the founder's instruction: "archive the old
screenshots."** All 26 PNGs moved to `archive-2026-06/`, which is what the
folder name now says about them — captured 2026-06-07, showing a product that
has since been rebuilt. They are kept, not deleted: they are the only record of
what the app looked like before the V2 homepage, and a before-state is worth
having. **Nothing in here should be used as a current portfolio shot.**

The earlier plan was to recapture once the deploy block cleared. That is no
longer the standing answer — the founder asked for them archived instead, so
recapturing is a fresh decision whenever he wants one, against whatever the app
looks like then.

**Do not delete these.** They are referenced by nothing in the app, which makes
them look like dead weight in a file-system tidy. They are not.

26 PNGs at 3840×2160, one per page, added deliberately in `dac6584`
(2026-06-07) — *"Add 4K (3840x2160) screenshots of all pages for portfolio"*.
8.6 MB tracked. They exist for **Dylan-coleman.com**, the portfolio the site's
own footer links to, and they live in the repo so the set stays in step with
the app rather than drifting in a folder somewhere.

This file exists because the 2026-08-20 founder batch listed the directory as
E4, *"remove or justify the referenced-by-nothing `screenshots/` directory"*.
This is the justification. The answer is keep.

## They are stale, and that is a real cost

Captured 2026-06-07. Since then the app has taken the V2 homepage, the mobile
overhaul (#271), the defect sweep (#274), the shared library card language
(#254/#259), and every Create tool has moved to `/create/<pagetitle>` (#266).

So several of these 26 show URLs that now 301, and several show layouts that no
longer exist. **A portfolio shot of a page that has since been rebuilt is worse
than no shot** — it advertises the older work as current.

Recapturing is a founder call, not an agent one: which pages belong in a
portfolio, and when the app is settled enough to be worth freezing, are both
judgement calls about how Dylan wants the work presented. **Answered 2026-09-14
— archive rather than recapture**, so the staleness above is now recorded in the
directory name instead of being a pending task. `docs/PROPOSALS.md` P-013 is
closed on that answer.

## Not to be confused with `docs/qa/screenshots/`

Different directory, opposite policy.

| | `screenshots/` | `docs/qa/screenshots/` |
|---|---|---|
| Purpose | portfolio, presentation | audit evidence |
| Tracked | **yes**, deliberately | **no** — `.gitignore` |
| Lifetime | until deliberately recaptured | regenerable; stale the moment the CSS moves |

The QA captures are ignored because they are 11 MB of PNGs that go out of date
the moment the stylesheet they document changes, and because re-running the
suite reproduces them. See the note at the top of the audits in `docs/qa/` for
how to regenerate the ones those documents cite.
