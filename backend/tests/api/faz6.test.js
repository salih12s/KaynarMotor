/*
 * Faz 6 regression testleri (gerçek sunucu + gerçek MariaDB): dış roller (yatırımcı, muhasebeci) ve yetkisiz
 * hesaplar gereğinden fazla veri görmemeli / yazmamalı. Negative testler: her rol × uç çifti ayrı doğrulanır.
 *
 *   #37 müşteri dizini (arama uçları) yalnız müşteri seçen ekranların yetkililerine açık
 *   #38 stok okuma uçları (alış fiyatlı) yalnız stoğu kullanan ekranların yetkililerine açık
 *   #39 yatırımcı motor kayıtlarında salt okunur; kendi motorunda alıcı/satıcı/komisyoncu kimliğini görmez
 *   #40 yatırımcı listesi (kullanıcı adlarıyla) yalnız admin'e açık
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { sunucuBaslat, kullaniciOlustur } = require('./yardimci');

const SON = Date.now().toString(36);
let s,
  api,
  admin,
  sayac = 0;
const benzersiz = (onek) => `${onek}${SON}${++sayac}`;
const k = {}; // rol/yetki -> { id, token }

before(async () => {
  s = await sunucuBaslat();
  api = s.api;
  admin = s.admin;
  k.yatirimci = await kullaniciOlustur(api, admin, benzersiz('f6_yat_'), 'yatirimci');
  k.muhasebeci = await kullaniciOlustur(api, admin, benzersiz('f6_muh_'), 'muhasebeci');
  k.bos = await kullaniciOlustur(api, admin, benzersiz('f6_bos_'), 'personel');
  k.servis = await kullaniciOlustur(api, admin, benzersiz('f6_srv_'), 'personel', { servis_yetkisi: true });
  k.aksesuar = await kullaniciOlustur(api, admin, benzersiz('f6_aks_'), 'personel', { aksesuar_yetkisi: true });
  k.motor = await kullaniciOlustur(api, admin, benzersiz('f6_mtr_'), 'personel', { motor_satis_yetkisi: true });
  k.yedek = await kullaniciOlustur(api, admin, benzersiz('f6_yed_'), 'personel', { yedek_parca_yetkisi: true });
  k.vitrin = await kullaniciOlustur(api, admin, benzersiz('f6_vit_'), 'personel', { aksesuar_vitrin_yetkisi: true });
});
after(() => s && s.durdur());

const durumlar = async (yontem, yol, kullanicilar) => {
  const sonuc = {};
  for (const ad of kullanicilar) sonuc[ad] = (await api(yontem, yol, undefined, k[ad].token)).durum;
  return sonuc;
};

describe('#37 müşteri dizini yalnız müşteri seçen ekranların yetkililerine açık', () => {
  const REDDEDILEN = ['yatirimci', 'muhasebeci', 'bos', 'vitrin'];
  const IZINLI = ['servis', 'aksesuar', 'motor', 'yedek'];

  it('arama ve telefon uçları dış rollere ve yetkisiz hesaba 403 verir', async () => {
    for (const yol of ['/api/musteriler/ara/ahmet', '/api/musteriler/telefon/05551112233']) {
      const d = await durumlar('GET', yol, REDDEDILEN);
      for (const ad of REDDEDILEN) assert.equal(d[ad], 403, `${yol}: ${ad} -> ${d[ad]}`);
    }
  });

  it('müşteri seçen ekranların yetkilileri hâlâ arayabilir', async () => {
    for (const yol of ['/api/musteriler/ara/ahmet', '/api/musteriler/telefon/05551112233']) {
      const d = await durumlar('GET', yol, IZINLI);
      for (const ad of IZINLI) assert.equal(d[ad], 200, `${yol}: ${ad} -> ${d[ad]}`);
    }
    assert.equal((await api('GET', '/api/musteriler/ara/ahmet', undefined, admin)).durum, 200);
  });
});

describe('#38 stok okuma uçları (alış fiyatlı) yalnız stoğu kullanan ekranların yetkililerine açık', () => {
  const REDDEDILEN = ['yatirimci', 'muhasebeci', 'bos', 'motor'];
  const YOLLAR = ['/api/aksesuar-stok', '/api/aksesuar-stok/ara?q=ka', '/api/yedek-parca-stok', '/api/yedek-parca-stok/ara?q=ba'];

  it('dış roller ve yetkisiz hesap stok listesini/aramasını okuyamaz (403)', async () => {
    for (const yol of YOLLAR) {
      const d = await durumlar('GET', yol, REDDEDILEN);
      for (const ad of REDDEDILEN) assert.equal(d[ad], 403, `${yol}: ${ad} -> ${d[ad]}`);
    }
  });

  it('stoğu kullanan ekranların yetkilileri okuyabilir', async () => {
    const okuyan = { '/api/aksesuar-stok': ['aksesuar', 'servis', 'vitrin'], '/api/yedek-parca-stok': ['yedek', 'servis'] };
    for (const [yol, kisiler] of Object.entries(okuyan)) {
      const d = await durumlar('GET', yol, kisiler);
      for (const ad of kisiler) assert.equal(d[ad], 200, `${yol}: ${ad} -> ${d[ad]}`);
    }
    assert.equal((await api('GET', '/api/yedek-parca-stok', undefined, admin)).durum, 200);
  });
});

describe('#39 yatırımcı motor kayıtlarında salt okunur ve karşı taraf kimliğini görmez', () => {
  let motorId, motorPlaka;
  before(async () => {
    motorPlaka = benzersiz('34F6').slice(0, 12);
    const r = await api(
      'POST',
      '/api/ikinci-el-motor',
      {
        plaka: motorPlaka,
        marka: 'Yamaha',
        model: 'R25',
        yil: 2020,
        km: 5000,
        alis_fiyati: 100000,
        satis_fiyati: 150000,
        masraflar: 2000,
        durum: 'tamamlandi',
        alici_adi: 'Ali Veli',
        alici_tc: '11111111111',
        alici_telefon: '05551112233',
        alici_adres: 'Gizli adres',
        satici_adi: 'Satici S',
        satici_tc: '22222222222',
        komisyoncu_adi: 'Komisyoncu K',
        komisyoncu_telefon: '05329998877',
        komisyoncu_tutari: 3000,
        yatirimci_id: k.yatirimci.id,
        yatirimci_kar: 5000,
        tarih: '2026-09-01',
        satis_tarihi: '2026-10-01',
      },
      admin,
    );
    assert.equal(r.durum, 201);
    motorId = r.govde.id;
  });

  it('kendi motorunu görür ama alıcı/satıcı/komisyoncu kimliği ve iletişimi gizlidir', async () => {
    const r = await api('GET', `/api/ikinci-el-motor/${motorId}`, undefined, k.yatirimci.token);
    assert.equal(r.durum, 200);
    for (const alan of ['plaka', 'marka', 'model', 'alis_fiyati', 'satis_fiyati', 'yatirimci_kar'])
      assert.ok(r.govde[alan] !== undefined && r.govde[alan] !== null, `${alan} görünmeli`);
    for (const alan of ['alici_adi', 'alici_tc', 'alici_telefon', 'alici_adres', 'satici_adi', 'satici_tc', 'komisyoncu_adi', 'komisyoncu_telefon']) {
      assert.ok(r.govde[alan] === null || r.govde[alan] === undefined, `${alan} sızıyor: ${r.govde[alan]}`);
    }
    const liste = (await api('GET', '/api/ikinci-el-motor', undefined, k.yatirimci.token)).govde.find((m) => m.id === motorId);
    assert.ok(liste, 'liste kendi motorunu içermeli');
    for (const alan of ['alici_tc', 'alici_adres', 'satici_tc']) assert.ok(liste[alan] === null || liste[alan] === undefined, `liste: ${alan} sızıyor`);
  });

  it('yatırımcı motor oluşturamaz, güncelleyemez, silemez (403)', async () => {
    const olustur = await api('POST', '/api/ikinci-el-motor', { plaka: benzersiz('34Y').slice(0, 12), marka: 'X', model: 'Y' }, k.yatirimci.token);
    assert.equal(olustur.durum, 403);
    const guncelle = await api('PUT', `/api/ikinci-el-motor/${motorId}`, { durum: 'stokta', plaka: 'DEGISTI' }, k.yatirimci.token);
    assert.equal(guncelle.durum, 403);
    const sil = await api('DELETE', `/api/ikinci-el-motor/${motorId}`, undefined, k.yatirimci.token);
    assert.equal(sil.durum, 403);
    const hala = (await api('GET', `/api/ikinci-el-motor/${motorId}`, undefined, admin)).govde;
    assert.equal(hala.plaka, motorPlaka);
    assert.equal(hala.durum, 'tamamlandi');
  });

  it('admin ve motor satış yetkilisi aynı motoru eskisi gibi tam görür/düzenler', async () => {
    const a = (await api('GET', `/api/ikinci-el-motor/${motorId}`, undefined, admin)).govde;
    assert.equal(a.alici_tc, '11111111111');
    const p = await api('GET', `/api/ikinci-el-motor/${motorId}`, undefined, k.motor.token);
    assert.equal(p.durum, 200);
    assert.equal(p.govde.alici_tc, '11111111111');
  });
});

describe("#40 yatırımcı listesi yalnız admin'e açık", () => {
  it('admin dışındaki herkes 403 alır, admin listeyi görür', async () => {
    const d = await durumlar('GET', '/api/auth/yatirimcilar', ['yatirimci', 'muhasebeci', 'bos', 'motor']);
    for (const [ad, durum] of Object.entries(d)) assert.equal(durum, 403, `${ad} -> ${durum}`);
    const a = await api('GET', '/api/auth/yatirimcilar', undefined, admin);
    assert.equal(a.durum, 200);
    assert.ok(Array.isArray(a.govde));
  });
});
