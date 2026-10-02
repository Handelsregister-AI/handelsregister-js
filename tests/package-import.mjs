import assert from 'node:assert/strict';

import { OrganizationFeature, SearchSort, walkFinancialAccounts } from '../dist/esm/index.js';

assert.equal(OrganizationFeature.NETWORK, 'network');
assert.equal(OrganizationFeature.SHAREHOLDERS_DEEP, 'shareholders_deep');
assert.deepEqual([...walkFinancialAccounts([{ name: 'Assets', value: 0 }])].map(node => node.value), [0]);
assert.equal(SearchSort.DISTANCE, 'distance');
console.log('ESM package import: PASS');
