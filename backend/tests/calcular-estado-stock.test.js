const test = require('node:test');
const assert = require('node:assert/strict');

function calcularEstadoStock(cantidadDisponible, stockMinimo, stockCritico) {
  if (stockMinimo <= 0 && stockCritico <= 0) return 'NORMAL';
  if (stockCritico > 0 && cantidadDisponible <= stockCritico) return 'CRITICO';
  if (stockMinimo > 0 && cantidadDisponible < stockMinimo) return 'BAJO';
  return 'NORMAL';
}

test('calcularEstadoStock marca crítico cuando disponible <= crítico', () => {
  assert.equal(calcularEstadoStock(2, 10, 5), 'CRITICO');
});

test('calcularEstadoStock marca bajo cuando disponible < mínimo', () => {
  assert.equal(calcularEstadoStock(8, 10, 0), 'BAJO');
});

test('calcularEstadoStock normal sin umbrales', () => {
  assert.equal(calcularEstadoStock(0, 0, 0), 'NORMAL');
});

test('calcularEstadoStock normal con stock suficiente', () => {
  assert.equal(calcularEstadoStock(20, 10, 5), 'NORMAL');
});
