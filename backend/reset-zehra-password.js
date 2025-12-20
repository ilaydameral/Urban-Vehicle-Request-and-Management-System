require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user');
const bcrypt = require('bcryptjs');

async function resetZehraPassword() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cityride');

        const user = await User.findOne({ email: 'zehra@gmail.com' });

        if (!user) {
            console.log('❌ User zehra@gmail.com not found!');
            process.exit(1);
        }

        console.log('✅ Found user:', user.email);
        console.log('Current role:', user.role);

        // Hash new password
        const newPassword = '123456';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        await user.save();

        console.log('✅ Password reset to: 123456');
        console.log('✅ Password is now hashed:', hashedPassword.substring(0, 20) + '...');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

resetZehraPassword();
