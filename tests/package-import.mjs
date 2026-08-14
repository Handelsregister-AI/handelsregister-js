import assert from 'node:assert/strict';

import { OrganizationFeature, SearchSort } from '../dist/esm/index.js';

assert.equal(OrganizationFeature.NETWORK, 'network');
assert.equal(SearchSort.DISTANCE, 'distance');
console.log('ESM package import: PASS');
