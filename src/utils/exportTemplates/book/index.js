// The design system book's templates, by id. Literal imports, so the server
// bundle carries every one. Add a template here and to src/config/exportTemplates.js.
import specification from './specification.js'
import monograph from './monograph.js'
import atlas from './atlas.js'

export const BOOK_TEMPLATES = Object.freeze({ specification, monograph, atlas })
