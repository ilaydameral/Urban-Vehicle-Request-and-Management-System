# Google Maps API Kurulum Rehberi

## 1. Google Cloud Console'a Giriş
1. [Google Cloud Console](https://console.cloud.google.com/) adresine gidin
2. Google hesabınızla giriş yapın

## 2. Yeni Proje Oluşturun (veya mevcut birini seçin)
1. Üst menüden "Select a Project" → "New Project" tıklayın
2. Proje adı: `Urban Vehicle System` (örnek)
3. "Create" butonuna basın

## 3. Billing (Ödeme) Hesabı Ekleyin
⚠️ **ÖNEMLİ**: Kredi kartı gerekir ama ilk $200 ÜCRETSİZ
1. Sol menüden "Billing" → "Link a billing account"
2. Yeni billing hesabı oluşturun
3. Kredi kartı bilgilerinizi girin
4. Google her ay $200 ücretsiz kredi veriyor, bunu aşmadıkça ücret yok

## 4. API'leri Aktif Edin
Sol menüden "APIs & Services" → "Library":

### Şu API'leri etkinleştirin:
- ✅ **Maps JavaScript API** (harita gösterimi için)
- ✅ **Places API** (adres arama için)
- ✅ **Directions API** (rota hesaplama için)
- ✅ **Geocoding API** (koordinat çevirme için)

Her birini arayın ve "ENABLE" butonuna basın.

## 5. API Key Oluşturun
1. Sol menüden "APIs & Services" → "Credentials"
2. Üstten "+ CREATE CREDENTIALS" → "API key"
3. API key oluşturulacak, kopyalayın ve kaydedin

## 6. API Key'i Güvenli Hale Getirin (Önerilen)
API key oluşturulduktan sonra:
1. "Restrict Key" butonuna tıklayın
2. **Application restrictions**:
   - "HTTP referrers (web sites)" seçin
   - Ekle: `http://localhost:5173/*`
   - Ekle: `http://localhost:*`
   - (Canlıya alınca domain'inizi de ekleyin)
   
3. **API restrictions**:
   - "Restrict key" seçin
   - Sadece şunları seçin:
     - Maps JavaScript API
     - Places API
     - Directions API
     - Geocoding API

4. "SAVE" butonuna basın

## 7. API Key'i Projenize Ekleyin

Frontend dizininde `.env` dosyası oluşturun:

```bash
cd /Users/zehrakulen/Desktop/Urban-Vehicle-Request-and-Management-System/frontend
```

`.env` dosyasına şunu ekleyin:
```
VITE_GOOGLE_MAPS_API_KEY=BURAYA_API_KEY_YAPIŞTIRIN
```

## 8. Uygulamayı Yeniden Başlatın

```bash
# Frontend'i yeniden başlatın
npm run dev
```

## Maliyet Tahmini

**ÜCRETSİZ Kotalar (Aylık):**
- İlk $200 kredi → yaklaşık 28,000 harita yüklemesi
- Places API: 2,500 ücretsiz arama
- Directions API: 2,500 ücretsiz rota hesaplama

**Küçük bir uygulama için ay sonuna kadar ücretsiz sınırları aşma ihtimaliniz çok düşük!**

## Sorun Giderme

### "This page can't load Google Maps correctly"
- API key doğru kopyalandı mı?
- `.env` dosyasında `VITE_` prefix'i var mı?
- Uygulama yeniden başlatıldı mı?
- Billing aktif mi?

### "Google Maps API error: ApiNotActivatedMapError"
- Maps JavaScript API etkinleştirildi mi?
- API key kısıtlamaları doğru mu?

---

**Sorularınız için:** [Google Maps Platform Support](https://developers.google.com/maps/support)
