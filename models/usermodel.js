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
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['student', 'teacher'],
        required: true
    },
    // [SECURITY] Device Lock Field
    deviceId: {
        type: String,
        default: null
    },
    // [NEW] Flag for reset requests
    deviceResetRequested: {
        type: Boolean,
        default: false
    },
    // Student face descriptor (128-d embedding stored as plain number array)
    faceDescriptor: {
        type: [Number],
        default: undefined
    }
});

UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

module.exports = mongoose.model('User', UserSchema);
