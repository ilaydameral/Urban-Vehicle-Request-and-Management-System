/**
 * TEST: MongoDB Transaction Desteği Kontrolü
 * 
 * Amaç: Sistemin standalone MongoDB'de çalışıp çalışmayacağını test etmek
 * 
 * Beklenen Durum:
 * - Replica Set veya MongoDB Atlas kullanılıyorsa: ✅ Transaction BAŞARILI
 * - Standalone MongoDB kullanılıyorsa: ❌ Transaction HATASI
 * 
 * Çalıştırma: node tests/test-db-transaction.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

async function testTransactionSupport() {
    console.log("========================================");
    console.log("MongoDB Transaction Desteği Testi");
    console.log("========================================\n");

    try {
        // 1. MongoDB'ye bağlan
        console.log("1️⃣  MongoDB'ye bağlanılıyor...");
        console.log(`   URI: ${process.env.MONGODB_URI.replace(/\/\/.*@/, "//***@")}`);

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("   ✅ Bağlantı başarılı\n");

        // 2. Topology (yapı) bilgisini kontrol et
        const topology = mongoose.connection.db.topology;
        const topologyType = topology?.description?.type || "unknown";

        console.log("2️⃣  MongoDB Yapısı:");
        console.log(`   Tip: ${topologyType}`);
        console.log(`   Sunucular: ${topology?.description?.servers?.size || 0}\n`);

        // 3. Transaction denemesi
        console.log("3️⃣  Transaction başlatılıyor...");

        let session;
        try {
            session = await mongoose.startSession();
            console.log("   ✅ Session oluşturuldu");

            session.startTransaction();
            console.log("   ✅ Transaction başlatıldı");

            // Basit bir işlem yap (dummy collection'a write)
            const testCollection = mongoose.connection.db.collection("_test_transactions");
            await testCollection.insertOne(
                { test: "transaction support", timestamp: new Date() },
                { session }
            );
            console.log("   ✅ Test write işlemi başarılı");

            await session.commitTransaction();
            console.log("   ✅ Transaction commit edildi\n");

            // Temizlik
            await testCollection.deleteMany({});

            console.log("========================================");
            console.log("SONUÇ: ✅ TRANSACTION DESTEĞİ MEVCUT");
            console.log("========================================");
            console.log("\n📊 Analiz:");
            console.log("   - MongoDB yapınız transaction'ları destekliyor");
            console.log("   - Tip: " + topologyType);

            if (topologyType === "ReplicaSetWithPrimary" || topologyType === "ReplicaSetNoPrimary") {
                console.log("   - Replica Set tespit edildi ✅");
            } else if (topologyType === "Sharded") {
                console.log("   - Sharded Cluster tespit edildi ✅");
            } else if (topologyType === "Single" || topologyType === "Standalone") {
                console.log("   - ⚠️  DIKKAT: Standalone tipinde transaction çalışmamalı!");
                console.log("   - MongoDB sürümü transaction desteği sunuyor olabilir (4.0+)");
            }

            console.log("\n✅ createTrip() ve completeTrip() fonksiyonları bu ortamda çalışacaktır.\n");

        } catch (txError) {
            console.log("   ❌ Transaction HATASI!\n");

            console.log("========================================");
            console.log("SONUÇ: ❌ TRANSACTION DESTEĞİ YOK");
            console.log("========================================");

            console.log("\n📊 Analiz:");
            console.log("   Hata Mesajı:", txError.message);

            if (txError.message.includes("Transaction numbers are only allowed")) {
                console.log("\n   🔍 Teşhis:");
                console.log("   - MongoDB STANDALONE modunda çalışıyor");
                console.log("   - Transaction desteği için Replica Set gerekli");
                console.log("\n   💡 Çözüm Önerileri:");
                console.log("   1. MongoDB'yi Replica Set olarak başlatın:");
                console.log("      mongod --replSet rs0");
                console.log("      mongo --eval 'rs.initiate()'");
                console.log("\n   2. VEYA MongoDB Atlas kullanın (otomatik replica set)");
                console.log("\n   3. VEYA tripController.js'deki transaction kodlarını kaldırın");
                console.log("      (Ancak bu race condition riskini artırır!)");
            }

            console.log("\n❌ createTrip() ve completeTrip() fonksiyonları bu ortamda HATA VERECEK!\n");

            if (session) {
                await session.abortTransaction();
            }
        } finally {
            if (session) {
                session.endSession();
            }
        }

    } catch (err) {
        console.error("\n❌ Test Başarısız:");
        console.error("   Hata:", err.message);

        if (err.message.includes("ECONNREFUSED")) {
            console.error("\n   💡 MongoDB sunucusu çalışmıyor olabilir.");
        }
    } finally {
        await mongoose.connection.close();
        console.log("Bağlantı kapatıldı.\n");
    }
}

// Test'i çalıştır
testTransactionSupport()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Kritik hata:", err);
        process.exit(1);
    });
