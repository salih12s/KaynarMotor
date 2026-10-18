const test = require('node:test');
const assert = require('node:assert/strict');
const { MedyaOnbellegi } = require('../../core/onbellek/medyaOnbellegi');

test('eklenen değer okunur; olmayan anahtar undefined', () => {
  const o = new MedyaOnbellegi({ azamiBayt: 100 });
  o.set('a', { x: 1 }, 10);
  assert.deepEqual(o.get('a'), { x: 1 });
  assert.equal(o.get('yok'), undefined);
});

test('sınır aşılınca en eski kullanılan atılır; okunan kayıt yenilenir', () => {
  const o = new MedyaOnbellegi({ azamiBayt: 30 });
  o.set('a', 'A', 10); o.set('b', 'B', 10); o.set('c', 'C', 10);
  o.get('a'); // a yenilendi, en eski artık b
  o.set('d', 'D', 10);
  assert.equal(o.get('b'), undefined);
  assert.equal(o.get('a'), 'A'); assert.equal(o.get('c'), 'C'); assert.equal(o.get('d'), 'D');
  assert.equal(o.toplamBayt, 30);
});

test('sınırın yarısından büyük değer önbelleğe alınmaz (tek büyük dosya hepsini silmesin)', () => {
  const o = new MedyaOnbellegi({ azamiBayt: 100 });
  o.set('kucuk', 'K', 10);
  o.set('dev', 'D', 60);
  assert.equal(o.get('dev'), undefined);
  assert.equal(o.get('kucuk'), 'K');
});

test('aynı anahtar yeniden eklenince toplam bayt çift sayılmaz', () => {
  const o = new MedyaOnbellegi({ azamiBayt: 100 });
  o.set('a', 'A1', 10); o.set('a', 'A2', 20);
  assert.equal(o.get('a'), 'A2');
  assert.equal(o.toplamBayt, 20);
});

test('ömrü dolan kayıt okunmaz ve bellekten düşer', () => {
  let t = 1000;
  const o = new MedyaOnbellegi({ azamiBayt: 100, omurMs: 500, simdi: () => t });
  o.set('a', 'A', 10);
  t = 1400; assert.equal(o.get('a'), 'A');
  t = 1600; assert.equal(o.get('a'), undefined);
  assert.equal(o.toplamBayt, 0);
});

test('azamiBayt 0 ise önbellek kapalıdır', () => {
  const o = new MedyaOnbellegi({ azamiBayt: 0 });
  o.set('a', 'A', 1);
  assert.equal(o.get('a'), undefined);
});
