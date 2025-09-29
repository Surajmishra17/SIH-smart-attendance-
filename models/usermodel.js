const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true, // No two users can have the same email
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['student', 'teacher'], // Role must be either 'student' or 'teacher'
        required: true
    }
});

// This function runs before a new user is saved to the database.
// It 'hashes' the password, turning it into a long, secure string.
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// This creates the 'User' model from the schema and exports it.
module.exports = mongoose.model('User', UserSchema);
