// scripts/resetPassword.js
require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../src/models/user');

async function resetPassword() {
    try {
        const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cityride';
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const email = 'zehra@gmail.com';
        const newPassword = '123456';

        const user = await User.findOne({ email });
        if (!user) {
            console.log('❌ User not found');
            process.exit(1);
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.role = 'ADMIN'; // Ensure ADMIN role
        user.isActive = true; // Ensure account is active
        await user.save();

        console.log('\n✅ Password reset successfully!');
        console.log('Email:', email);
        console.log('New Password:', newPassword);
        console.log('Role:', user.role);
        console.log('Active:', user.isActive);

        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

resetPassword();
