const assert = require('node:assert/strict');
const sdk = require('../dist');

assert.equal(sdk.OrganizationFeature.NETWORK, 'network');
assert.equal(sdk.OrganizationFeature.SHAREHOLDERS_DEEP, 'shareholders_deep');
assert.deepEqual([...sdk.walkFinancialAccounts([{ name: 'Assets', value: 0 }])].map(node => node.value), [0]);
assert.equal(sdk.SearchSort.DISTANCE, 'distance');
console.log('CommonJS package import: PASS');
