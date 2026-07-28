const test = require('node:test');
const assert = require('node:assert/strict');

function resolvePageSize(filtros) {
  const maxSize = filtros.export ? 2000 : 100;
  return Math.min(maxSize, Math.max(1, Number(filtros.pageSize) || 10));
}

test('pageSize normal capa en 100', () => {
  assert.equal(resolvePageSize({ pageSize: 500 }), 100);
});

test('pageSize export permite hasta 2000', () => {
  assert.equal(resolvePageSize({ pageSize: 2000, export: true }), 2000);
});

test('pageSize export no supera 2000', () => {
  assert.equal(resolvePageSize({ pageSize: 5000, export: true }), 2000);
});
