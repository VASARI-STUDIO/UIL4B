// Which parts of a view the pair under test paints, in palette context mode.
//
// Every part says what it does with data-job ("text", "fill-label", "beside", or
// two of them in one word list when it is both). When the pair's own job is one of
// them the part also carries data-pair-part: the view's stylesheet paints those
// parts in the pair, and PairExample marks (outlines, counts) only those. Spread
// the result onto the part's element.
//
// `job` is null when palette context is off, so no part is marked and the view
// paints as it always has.

/**
 * @param {string} jobs the job(s) this part does, space separated
 * @param {'text'|'fill-label'|'beside'|null} job the pair's job, or null
 * @returns {{'data-job': string, 'data-pair-part'?: string}}
 */
export function part(jobs, job) {
  return job && jobs.split(' ').includes(job)
    ? { 'data-job': jobs, 'data-pair-part': '' }
    : { 'data-job': jobs }
}
