// scripts/seedUsers.js
require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../src/models/user');

const users = [
    {
        name: 'Admin User',
        email: 'admin@test.com',
        password: '123456',
        role: 'ADMIN'
    },
    {
        name: 'Zehra Kulen',
        email: 'zehra@gmail.com',
        password: '123456',
        role: 'ADMIN'
    },
    {
        name: 'Coordinator User',
        email: 'coordinator@test.com',
        password: '123456',
        role: 'COORDINATOR'
    },
    {
        name: 'Driver User',
        email: 'driver@test.com',
        password: '123456',
        role: 'DRIVER'
    },
    {
        name: 'Passenger User',
        email: 'passenger@test.com',
        password: '123456',
        role: 'PASSENGER'
    }
];

async function seedUsers() {
    try {
        const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cityride';
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing users
        await User.deleteMany({});
        console.log('🗑️  Cleared existing users');

        // Create new users
        for (const userData of users) {
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            await User.create({
                ...userData,
                password: hashedPassword
            });
            console.log(`✅ Created user: ${userData.email} (${userData.role})`);
        }

        console.log('\n🎉 All users seeded successfully!\n');
        console.log('Demo Credentials:');
        console.log('==================');
        users.forEach(u => {
            console.log(`${u.role.padEnd(15)} | ${u.email.padEnd(25)} | 123456`);
        });

        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding users:', err);
        process.exit(1);
    }
}

seedUsers();
