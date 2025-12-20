require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const User = require('./backend/src/models/user');

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
            console.log('Password starts with $2:', user.password?.startsWith('$2'));
        }
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
