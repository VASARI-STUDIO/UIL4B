// 12 Nov fix round: where each Kerbside photograph keeps its subject when a frame crops it (object-position).
// riders: both riders and the orange bag sit in the right half; evening: the rider walks in the left third.
const FOCUS = { riders: '88% 50%', evening: '0% 50%' };
export const focusOf = (id, fallback = '50% 50%') => FOCUS[id] || fallback;
// a real photographer's credit prints; the sample brand's generated photographs carry none (11 Nov decision)
export const creditOf = (shot) => (shot && shot.credit && !shot.generated ? shot.credit : '');
