/**
 * TEST: Race Condition Simülasyonu
 * 
 * Senaryo: İki sürücü aynı anda aynı PENDING request'i kabul etmeye çalışıyor
 * 
 * Beklenen Sonuç:
 * - Sadece BİR sürücü başarılı olmalı (201)
 * - Diğer sürücü hata almalı (400 veya 409)
 * 
 * Test Adımları:
 * 1. Bir PENDING request oluştur
 * 2. İki farklı driver token ile AYNI ANDA createTrip çağır
 * 3. Sonuçları karşılaştır
 */

const axios = require("axios");

const BASE_URL = "http://localhost:5001/api";

// Test konfigürasyonu
const CONFIG = {
    // Bu değerleri gerçek test kullanıcılarınıza göre ayarlayın
    passenger: {
        email: "passenger@test.com",
        password: "123456"
    },
    driver1: {
        email: "driver1@test.com",
        password: "123456"
    },
    driver2: {
        email: "driver2@test.com",
        password: "123456"
    }
};

async function login(email, password) {
    try {
        const res = await axios.post(`${BASE_URL}/auth/login`, { email, password });
        return res.data.token;
    } catch (err) {
        console.error(`Login failed for ${email}:`, err.response?.data?.message || err.message);
        return null;
    }
}

async function createRequest(token, pickup, dropoff) {
    try {
        const res = await axios.post(
            `${BASE_URL}/requests`,
            { pickupAddress: pickup, dropoffAddress: dropoff },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data.request;
    } catch (err) {
        console.error("Request creation failed:", err.response?.data?.message);
        return null;
    }
}

async function createTrip(token, requestId, driverName) {
    const startTime = Date.now();
    try {
        const res = await axios.post(
            `${BASE_URL}/trips`,
            { requestId },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const duration = Date.now() - startTime;
        return {
            success: true,
            driver: driverName,
            status: res.status,
            tripId: res.data.trip._id,
            duration,
            message: "Trip created successfully"
        };
    } catch (err) {
        const duration = Date.now() - startTime;
        return {
            success: false,
            driver: driverName,
            status: err.response?.status,
            duration,
            message: err.response?.data?.message || err.message
        };
    }
}

async function runRaceConditionTest() {
    console.log("========================================");
    console.log("RACE CONDITION TEST");
    console.log("========================================\n");

    console.log("📋 Test Senaryosu:");
    console.log("   İki sürücü AYNI ANDA aynı request'i kabul etmeye çalışacak\n");

    // 1. Login
    console.log("1️⃣  Kullanıcılar login oluyor...");
    const passengerToken = await login(CONFIG.passenger.email, CONFIG.passenger.password);
    const driver1Token = await login(CONFIG.driver1.email, CONFIG.driver1.password);
    const driver2Token = await login(CONFIG.driver2.email, CONFIG.driver2.password);

    if (!passengerToken || !driver1Token || !driver2Token) {
        console.error("\n❌ Login başarısız! Test kullanıcılarını oluşturun.");
        console.log("\n💡 Gerekli kullanıcılar:");
        console.log("   - passenger@test.com (role: PASSENGER)");
        console.log("   - driver1@test.com (role: DRIVER, approved)");
        console.log("   - driver2@test.com (role: DRIVER, approved)");
        return;
    }
    console.log("   ✅ Tüm kullanıcılar giriş yaptı\n");

    // 2. Request oluştur
    console.log("2️⃣  PENDING request oluşturuluyor...");
    const request = await createRequest(
        passengerToken,
        "Test Pickup Address",
        "Test Dropoff Address"
    );

    if (!request) {
        console.error("   ❌ Request oluşturulamadı!");
        return;
    }
    console.log(`   ✅ Request ID: ${request._id}`);
    console.log(`   Status: ${request.status}\n`);

    // 3. RACE CONDITION - AYNI ANDA İKİ İSTEK
    console.log("3️⃣  RACE CONDITION başlatılıyor...");
    console.log("   Driver1 ve Driver2 AYNI ANDA trip oluşturuyor...\n");

    const [result1, result2] = await Promise.all([
        createTrip(driver1Token, request._id, "Driver1"),
        createTrip(driver2Token, request._id, "Driver2")
    ]);

    // 4. Sonuçları analiz et
    console.log("========================================");
    console.log("SONUÇLAR");
    console.log("========================================\n");

    console.log(`${result1.driver}:`);
    console.log(`   Başarılı: ${result1.success ? "✅" : "❌"}`);
    console.log(`   HTTP Status: ${result1.status}`);
    console.log(`   Süre: ${result1.duration}ms`);
    console.log(`   Mesaj: ${result1.message}`);
    if (result1.tripId) console.log(`   Trip ID: ${result1.tripId}`);
    console.log();

    console.log(`${result2.driver}:`);
    console.log(`   Başarılı: ${result2.success ? "✅" : "❌"}`);
    console.log(`   HTTP Status: ${result2.status}`);
    console.log(`   Süre: ${result2.duration}ms`);
    console.log(`   Mesaj: ${result2.message}`);
    if (result2.tripId) console.log(`   Trip ID: ${result2.tripId}`);
    console.log();

    // 5. Değerlendirme
    console.log("========================================");
    console.log("DEĞERLENDİRME");
    console.log("========================================\n");

    const successCount = [result1, result2].filter(r => r.success).length;

    if (successCount === 2) {
        console.log("❌ HATA: İKİ SÜRÜCÜ DE BAŞARILI OLDU!");
        console.log("\n🔍 Analiz:");
        console.log("   - Race condition koruması ÇALIŞMIYOR");
        console.log("   - Aynı request için iki farklı trip kaydedildi");
        console.log("   - Veri tutarsızlığı riski VAR");
        console.log("\n💡 Neden:");
        console.log("   - Trip.js modelindeki unique index eksik veya çalışmıyor");
        console.log("   - Transaction kullanımı yetersiz");
        console.log("   - Request status güncellemesi atomic değil");
    } else if (successCount === 1) {
        console.log("✅ BAŞARILI: Sadece bir sürücü trip oluşturabildi");
        console.log("\n🔍 Analiz:");
        console.log("   - Race condition koruması ÇALIŞIYOR");
        console.log("   - Unique index veya transaction sistemi doğru çalışıyor");

        const failedResult = result1.success ? result2 : result1;
        console.log(`\n   Reddedilen istek: ${failedResult.driver}`);
        console.log(`   Hata kodu: ${failedResult.status}`);
        console.log(`   Hata mesajı: "${failedResult.message}"`);

        if (failedResult.status === 409) {
            console.log("\n   ✅ 409 Conflict kodu beklenen davranış");
        } else if (failedResult.status === 400) {
            console.log("\n   ✅ 400 Bad Request kodu kabul edilebilir");
        }
    } else {
        console.log("❌ HİÇBİR SÜRÜCÜ BAŞARILI OLAMADI");
        console.log("\n🔍 Analiz:");
        console.log("   - Test kullanıcılarında problem olabilir");
        console.log("   - Driver approval veya vehicle eksik olabilir");
    }

    console.log("\n========================================\n");
}

// Manuel test için örnek Postman/cURL komutları
console.log("========================================");
console.log("MANUEL TEST İÇİN POSTMAN ADIMLARI");
console.log("========================================\n");

console.log("1. Bir PENDING request oluşturun (Passenger olarak)");
console.log("   POST /api/requests");
console.log('   Body: { "pickupAddress": "A", "dropoffAddress": "B" }');
console.log("   Response'tan request._id'yi kopyalayın\n");

console.log("2. İki Postman tab'inde aynı anda gönderim yapın:");
console.log("   Tab 1 (Driver1): POST /api/trips");
console.log("   Tab 2 (Driver2): POST /api/trips");
console.log('   Body (her ikisi de): { "requestId": "KOPYALADIĞINIZ_ID" }');
console.log("   Header: Authorization: Bearer DRIVER_TOKEN\n");

console.log("3. Sonuçları karşılaştırın:");
console.log("   - Bir tab 201 Created dönmeli");
console.log("   - Diğer tab 400/409 Error dönmeli");
console.log("========================================\n");

// Test'i çalıştır
if (require.main === module) {
    runRaceConditionTest()
        .then(() => {
            console.log("Test tamamlandı.");
            process.exit(0);
        })
        .catch((err) => {
            console.error("Test hatası:", err);
            process.exit(1);
        });
}

module.exports = { runRaceConditionTest };
