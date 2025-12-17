require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cityride')
    .then(async () => {
        const user = await User.findOne({ email: 'zehra@gmail.com' });
        if (!user) {
            console.log('❌ User not found!');
        } else {
            console.log('✅ User found:');
            console.log('Email:', user.email);
            console.log('Name:', user.name);
            console.log('Role:', user.role);
            console.log('Has password:', !!user.password);
            console.log('Password is hashed:', user.password?.startsWith('$2'));

            // Try comparing password
            const bcrypt = require('bcryptjs');
            const isMatch = await bcrypt.compare('123456', user.password);
            console.log('Password 123456 matches:', isMatch);
        }
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err.message);
        process.exit(1);
    });
