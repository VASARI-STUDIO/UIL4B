// What a themed document says about the project (api/_lib/exportThemes/brandFromProject.js): the project's own name and what it has said
// about itself, with the example copy only where it has said nothing.
//   1. THE NAME: the project's name; its identity name when the project has none; 'Your brand' only when there is neither.
//      Break: ignore design.identity.name.
//   2. THE COPY: the identity's description stands in for the description and the product line; without it the example copy stays.
//      Break: drop the `own.description` spread in build().
import test from 'node:test'
import assert from 'node:assert/strict'
import { projectToBrand } from '../../api/_lib/exportThemes/brandFromProject.js'

const EXAMPLE = 'Write this in your own words.'

test("the project's name leads, then its identity name, then the example name", () => {
  assert.equal(projectToBrand({ projectName: 'Kerbside', design: { identity: { name: 'Other' } } }).name, 'Kerbside')
  assert.equal(projectToBrand({ projectName: '', design: { identity: { name: 'Kerbside' } } }).name, 'Kerbside')
  assert.equal(projectToBrand({}).name, 'Your brand')
})

test('what the project has said stands; what it has not said stays the example copy', () => {
  const said = projectToBrand({ projectName: 'Kerbside', design: { identity: { description: '  Parking,\n simply. ' } } })
  assert.equal(said.description, 'Parking, simply.')
  assert.equal(said.product, 'Parking, simply.')
  const silent = projectToBrand({ projectName: 'Kerbside' })
  assert.equal(silent.description, EXAMPLE)
  assert.equal(silent.product, EXAMPLE)
})
