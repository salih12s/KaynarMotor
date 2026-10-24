// "API_URL is not defined" hatası: vitrinApi.js içinde tanımsız bir değişken kullanılıyordu; derleme uyarı vermeden geçti,
// ama ana sayfadaki "Motor Satış" ilan listesi çizilirken beyaz ekran verdi. Bu test src altındaki TÜM dosyaları
// ESLint'in `no-undef` kuralıyla tarar: tanımsız bir değişken kalırsa test kırılır.
// ESLint ayrı süreçte çalışır (Jest'in modül çözümlemesi react-app yapılandırmasını yükleyemiyor).
const path = require('path');
const { spawnSync } = require('child_process');

test('src altında tanımsız değişken (no-undef) yok', () => {
  const kok = path.resolve(__dirname, '..');
  const r = spawnSync(
    process.execPath,
    [
      path.join(kok, 'node_modules', 'eslint', 'bin', 'eslint.js'),
      '--no-eslintrc',
      '-c',
      path.join(kok, 'node_modules', 'eslint-config-react-app', 'index.js'),
      '--rule',
      '{"no-undef":"error"}',
      '--ext',
      '.js,.jsx',
      '--format',
      'json',
      'src',
    ],
    { cwd: kok, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  const sonuclar = JSON.parse(r.stdout);
  const hatalar = sonuclar.flatMap((f) =>
    f.messages.filter((m) => m.ruleId === 'no-undef').map((m) => `${path.relative(__dirname, f.filePath)}:${m.line} ${m.message}`),
  );
  expect(hatalar).toEqual([]);
}, 120000);
