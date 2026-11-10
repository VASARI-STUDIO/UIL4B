// What a new project says while the account's own project count is not known.
//
// The cap is checked against the account's list. On a device that has never seen the account that list is
// empty until the first read lands, and stays empty if the read failed, so neither state can say "room for
// one more". A save that meets either one is refused with one of these sentences and a `code`, and nothing
// is created: the working design stays where it is, so no work is lost.

export const COUNT_UNKNOWN_CODE = 'projects-unknown'

export const COUNT_LOADING_MESSAGE = 'Still checking your projects. Try again in a moment.'
export const COUNT_FAILED_MESSAGE = 'Your projects couldn’t be checked, so this can’t be saved as a new project yet. Your work is kept here. Try again.'

// New project on /projects when the list failed: the page also shows its own Try again.
export const COUNT_FAILED_NEW_MESSAGE = 'Your projects couldn’t be checked, so a new one can’t start yet.'

/** The error saveProject() throws while the count is unknown. */
export function countUnknownError(loading) {
  const error = new Error(loading ? COUNT_LOADING_MESSAGE : COUNT_FAILED_MESSAGE)
  error.code = COUNT_UNKNOWN_CODE
  return error
}

export const isCountUnknownError = (error) => error?.code === COUNT_UNKNOWN_CODE

/** True for the two sentences above, for a surface that only holds the message. */
export const isCountUnknownMessage = (message) => (
  message === COUNT_LOADING_MESSAGE || message === COUNT_FAILED_MESSAGE || message === COUNT_FAILED_NEW_MESSAGE
)
