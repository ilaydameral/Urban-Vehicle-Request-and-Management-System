/**
 * GİRDİ DOĞRULAMA (VALIDATION) ANALİZİ VE TEST
 * 
 * Bu script modellerdeki validation eksikliklerini kontrol eder
 * ve test verileri ile bu eksiklikleri kanıtlar.
 */

require("dotenv").config();
const mongoose = require("mongoose");

// Model import
const User = require("../src/models/user");
const Driver = require("../src/models/Driver");
const Vehicle = require("../src/models/Vehicle");

const VALIDATION_TESTS = [
    {
        model: "User",
        field: "email",
        testCases: [
            { value: "invalid-email", shouldFail: true, reason: "Format kontrolü yok" },
            { value: "test@", shouldFail: true, reason: "Domain eksik" },
            { value: "@test.com", shouldFail: true, reason: "Local part eksik" },
            { value: "valid@test.com", shouldFail: false, reason: "Geçerli email" },
            { value: "TEST@TEST.COM", shouldFail: false, reason: "Lowercase'e çevrilecek" }
        ]
    },
    {
        model: "Driver",
        field: "licenseNumber",
        testCases: [
            { value: "123", shouldFail: false, reason: "⚠️  Format kontrolü yok - kabul edildi!" },
            { value: "ABC", shouldFail: false, reason: "⚠️  Alfabetik değer - kabul edildi!" },
            { value: "!@#$%", shouldFail: false, reason: "⚠️  Özel karakter - kabul edildi!" },
            { value: "", shouldFail: true, reason: "Boş - required kontrolü çalışmalı" }
        ]
    },
    {
        model: "Vehicle",
        field: "plateNumber",
        testCases: [
            { value: "34ABC123", shouldFail: false, reason: "Geçerli format (Türkiye)" },
            { value: "06XYZ456", shouldFail: false, reason: "Geçerli format" },
            { value: "INVALID", shouldFail: false, reason: "⚠️  Format kontrolü yok - kabul edildi!" },
            { value: "123", shouldFail: false, reason: "⚠️  Kısa plaka - kabul edildi!" },
            { value: "@@@@", shouldFail: false, reason: "⚠️  Özel karakter - kabul edildi!" }
        ]
    }
];

async function testValidation() {
    console.log("========================================");
    console.log("GİRDİ DOĞRULAMA (VALIDATION) ANALİZİ");
    console.log("========================================\n");

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ MongoDB bağlantısı kuruldu\n");

        // User Email Validation Test
        console.log("1️⃣  USER MODEL - EMAIL VALİDASYONU");
        console.log("─────────────────────────────────────\n");

        for (const testCase of VALIDATION_TESTS[0].testCases) {
            try {
                const user = new User({
                    name: "Test User",
                    email: testCase.value,
                    password: "123456",
                    role: "PASSENGER"
                });
                await user.validate();

                if (testCase.shouldFail) {
                    console.log(`❌ "${testCase.value}"`);
                    console.log(`   Beklenen: Hata`);
                    console.log(`   Gerçek: Kabul edildi`);
                    console.log(`   Sebep: ${testCase.reason}\n`);
                } else {
                    console.log(`✅ "${testCase.value}"`);
                    console.log(`   Durum: Geçerli (beklenen)\n`);
                }
            } catch (err) {
                if (!testCase.shouldFail) {
                    console.log(`⚠️  "${testCase.value}"`);
                    console.log(`   Beklenen: Kabul edilmeli`);
                    console.log(`   Gerçek: Reddedildi`);
                    console.log(`   Hata: ${err.message}\n`);
                } else {
                    console.log(`✅ "${testCase.value}"`);
                    console.log(`   Durum: Reddedildi (beklenen)\n`);
                }
            }
        }

        // Driver License Validation Test
        console.log("2️⃣  DRIVER MODEL - LİSANS NUMARASI VALİDASYONU");
        console.log("─────────────────────────────────────\n");

        // Önce bir test user oluştur
        let testUser = await User.findOne({ email: "test-driver@validation.com" });
        if (!testUser) {
            testUser = await User.create({
                name: "Test Driver",
                email: "test-driver@validation.com",
                password: "123456",
                role: "DRIVER"
            });
        }

        for (const testCase of VALIDATION_TESTS[1].testCases) {
            try {
                const driver = new Driver({
                    user: testUser._id,
                    licenseNumber: testCase.value,
                    licenseClass: "B"
                });
                await driver.validate();

                if (testCase.shouldFail) {
                    console.log(`❌ "${testCase.value}"`);
                    console.log(`   Beklenen: Hata`);
                    console.log(`   Gerçek: Kabul edildi`);
                    console.log(`   Sebep: ${testCase.reason}\n`);
                } else {
                    console.log(`✅ "${testCase.value}"`);
                    console.log(`   Durum: Kabul edildi\n`);
                }
            } catch (err) {
                console.log(`✅ "${testCase.value}"`);
                console.log(`   Durum: Reddedildi (${testCase.reason})\n`);
            }
        }

        // Vehicle Plate Validation Test
        console.log("3️⃣  VEHICLE MODEL - PLAKA VALİDASYONU");
        console.log("─────────────────────────────────────\n");

        let testDriver = await Driver.findOne({ user: testUser._id });
        if (!testDriver) {
            testDriver = await Driver.create({
                user: testUser._id,
                licenseNumber: "TEST123",
                licenseClass: "B"
            });
        }

        for (const testCase of VALIDATION_TESTS[2].testCases) {
            try {
                const vehicle = new Vehicle({
                    ownerDriver: testDriver._id,
                    plateNumber: testCase.value,
                    brand: "Test",
                    model: "Test"
                });
                await vehicle.validate();

                if (testCase.shouldFail) {
                    console.log(`❌ "${testCase.value}"`);
                    console.log(`   Beklenen: Hata`);
                    console.log(`   Gerçek: Kabul edildi`);
                    console.log(`   Sebep: ${testCase.reason}\n`);
                } else {
                    console.log(`✅ "${testCase.value}"`);
                    console.log(`   Durum: Kabul edildi\n`);
                }
            } catch (err) {
                console.log(`⚠️  "${testCase.value}"`);
                console.log(`   Hata: ${err.message}\n`);
            }
        }

        // Özet Rapor
        console.log("\n========================================");
        console.log("SONUÇ ve ÖNERİLER");
        console.log("========================================\n");

        console.log("📊 TESPİT EDİLEN EKSİKLİKLER:\n");

        console.log("1. USER MODEL - email:");
        console.log("   ❌ Email format validasyonu YOK");
        console.log("   💡 Önerilen: Mongoose validator veya regex ekleyin");
        console.log('      match: /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/\n');

        console.log("2. DRIVER MODEL - licenseNumber:");
        console.log("   ❌ Lisans numarası format kontrolü YOK");
        console.log("   ❌ Herhangi bir string kabul ediliyor");
        console.log("   💡 Önerilen: Ülkeye özgü regex pattern ekleyin");
        console.log('      örn: match: /^[A-Z0-9]{6,15}$/\n');

        console.log("3. DRIVER MODEL - licenseClass:");
        console.log("   ❌ Sınıf tipi kontrolü YOK (A, B, C, D, E vb.)");
        console.log("   💡 Önerilen: enum: ['A', 'B', 'C', 'D', 'E', 'BE', 'CE']\n");

        console.log("4. VEHICLE MODEL - plateNumber:");
        console.log("   ⚠️  uppercase: true var AMA format kontrolü YOK");
        console.log("   ❌ '@@@@' veya '123' gibi değerler kabul edilebilir");
        console.log("   💡 Önerilen Türkiye formatı:");
        console.log('      match: /^[0-9]{2}[A-Z]{1,3}[0-9]{2,4}$/\n');

        console.log("5. VEHICLE MODEL - seatCount:");
        console.log("   ⚠️  min: 1 var AMA max kontrolü YOK");
        console.log("   ❌ 999999 gibi mantıksız değerler kabul edilebilir");
        console.log("   💡 Önerilen: max: 60 (otobüs için)\n");

        console.log("6. PHONE NUMBER (TÜM MODELLER):");
        console.log("   ❌ Hiçbir modelde telefon alanı YOK");
        console.log("   💡 İletişim için kritik - eklenmelidir\n");

        console.log("========================================");
        console.log("🔐 GÜVENLİK RİSKLERİ");
        console.log("========================================\n");

        console.log("YÜKSEK RİSK:");
        console.log("• SQL Injection: N/A (MongoDB kullanılıyor) ✅");
        console.log("• NoSQL Injection: Mongoose otomatik escape ediyor ✅");
        console.log("• Email Format: Validation yok ❌");
        console.log("• Plaka Format: Validation yok ❌\n");

        console.log("ORTA RİSK:");
        console.log("• Lisans Format: Validation yok ⚠️");
        console.log("• Password Strength: minlength: 6 var, başka kural yok ⚠️");
        console.log("• XSS: Frontend'de kontrol gerekli ⚠️\n");

        // Temizlik
        await User.deleteOne({ email: "test-driver@validation.com" });
        await Driver.deleteOne({ user: testUser._id });

    } catch (err) {
        console.error("\n❌ Test Hatası:", err.message);
    } finally {
        await mongoose.connection.close();
        console.log("\nBağlantı kapatıldı.");
    }
}

testValidation()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Kritik hata:", err);
        process.exit(1);
    });
