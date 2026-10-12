// Withdrawal requirements: the owner panel's policy entry mirrors the backend catalogue
// (backend/packages/common/src/featureCatalogue.js), so a save is accepted by the backend apply.
//   node --test scripts/withdrawalRequirements.test.mjs
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

import { featureByKey, isPolicy, isVariantOf } from '../src/configs/entitlementCatalogue.ts'
import { demoVariants } from './seed-owner.mjs'

const require = createRequire(import.meta.url)
const backendCatalogue = require('../../backend/packages/common/src/featureCatalogue.js')

const KEY = 'withdrawal_requirements'

test('mirrors the backend: a policy, same default and variants', () => {
  const ours = featureByKey(KEY)
  const theirs = backendCatalogue.featureByKey(KEY)

  assert.equal(isPolicy(KEY), true)
  assert.equal(theirs.kind, 'policy')
  assert.equal(ours.category, 'business')
  assert.equal(ours.defaultVariant, 'kyc')
  assert.equal(theirs.defaultVariant, 'kyc')
  assert.deepEqual(ours.variants.map(v => v.key), ['none', 'kyc', 'wager', 'kyc_and_wager'])
  assert.deepEqual(ours.variants.map(v => v.key), theirs.variants.map(v => v.key))
  assert.deepEqual(ours.variants.map(v => v.label), theirs.variants.map(v => v.label))
  for (const v of ['none', 'kyc', 'wager', 'kyc_and_wager']) assert.equal(isVariantOf(KEY, v), true)
  assert.equal(isVariantOf(KEY, 'both'), false)
})

test('the demo seed keeps today’s behaviour: kyc', () => {
  assert.equal(demoVariants()[KEY], 'kyc')
})
