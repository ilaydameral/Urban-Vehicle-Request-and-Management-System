// scripts/checkUser.js
require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const User = require('../src/models/user');

async function checkUser() {
    try {
        const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cityride';
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const user = await User.findOne({ email: 'zehra@gmail.com' });
        if (user) {
            console.log('\n📧 User found:');
            console.log('Name:', user.name);
            console.log('Email:', user.email);
            console.log('Role:', user.role);
            console.log('Active:', user.isActive);
            console.log('Password Hash:', user.password.substring(0, 30) + '...');
        } else {
            console.log('❌ User not found');
        }

        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

checkUser();
