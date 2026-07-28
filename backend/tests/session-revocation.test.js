import test from 'node:test';
import assert from 'node:assert/strict';

// Copia mínima de la lógica de tokenVersionEnJwt para test sin compilar TS
function tokenVersionEnJwt(decoded) {
  const tv = decoded['tv'];
  return typeof tv === 'number' && Number.isFinite(tv) ? Math.trunc(tv) : 0;
}

test('tokenVersionEnJwt usa 0 si falta tv', () => {
  assert.equal(tokenVersionEnJwt({ rut: '1-9' }), 0);
});

test('tokenVersionEnJwt lee tv entero', () => {
  assert.equal(tokenVersionEnJwt({ rut: '1-9', tv: 3 }), 3);
});

test('tokenVersionEnJwt trunca decimales', () => {
  assert.equal(tokenVersionEnJwt({ tv: 2.9 }), 2);
});
