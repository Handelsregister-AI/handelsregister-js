const assert = require('node:assert/strict');
const sdk = require('../dist');

assert.equal(sdk.OrganizationFeature.NETWORK, 'network');
assert.equal(sdk.SearchSort.DISTANCE, 'distance');
console.log('CommonJS package import: PASS');
