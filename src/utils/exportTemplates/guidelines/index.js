// The brand guidelines' templates, by id. Literal imports, so the server bundle
// carries every one. Add a template here and to src/config/exportTemplates.js.
import presentation from './presentation.js'
import poster from './poster.js'

export const GUIDELINES_TEMPLATES = Object.freeze({ presentation, poster })
