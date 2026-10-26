import assert from 'node:assert/strict';

import { Company, OrganizationFeature, SearchSort, walkFinancialAccounts } from '../dist/esm/index.js';

assert.equal(OrganizationFeature.NETWORK, 'network');
assert.equal(OrganizationFeature.SHAREHOLDERS_DEEP, 'shareholders_deep');
assert.deepEqual([...walkFinancialAccounts([{ name: 'Assets', value: 0 }])].map(node => node.value), [0]);
assert.equal(SearchSort.DISTANCE, 'distance');
assert.equal(typeof Company.prototype.getAnnualFinancialStatements, 'function');
assert.equal(typeof Company.prototype.getAnnualFinancialStatementsForYear, 'function');
console.log('ESM package import: PASS');
