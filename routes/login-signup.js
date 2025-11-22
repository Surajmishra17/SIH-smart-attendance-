const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/usermodel.js');

router.get('/', (req, res) => {
    res.render('login-signup');
});

router.post('/login', async (req, res) => {
    const { email, password, role, deviceId } = req.body;

    try {
        const user = await User.findOne({ email, role });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid credentials. Please check your email and role.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
        }

        // [SECURITY] Device Locking Logic
        if (role === 'student') {
            if (!user.deviceId) {
                // First time login: Lock to this device
                user.deviceId = deviceId;
                await user.save();
            } else if (user.deviceId !== deviceId) {
                // Mismatch: Block login
                return res.status(403).json({
                    success: false,
                    message: 'Security Alert: You are attempting to login from an unregistered device. To prevent proxy attendance, you must use your registered phone.'
                });
            }
        }

        req.session.userId = user._id;

        if (role === 'student') {
            res.json({ success: true, message: `Welcome back, ${user.name}!`, redirectUrl: '/dashboard/student' });
        } else if (role === 'teacher') {
            res.json({ success: true, message: `Welcome back, ${user.name}!`, redirectUrl: '/dashboard/teacher' });
        }

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

router.post('/signup', async (req, res) => {
    const { name, email, password, role, deviceId } = req.body;

    try {
        let user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
        }

        user = new User({
            name,
            email,
            password,
            role,
            deviceId // [SECURITY] Register device immediately
        });

        await user.save();

        res.json({ success: true, message: `Account created for ${name}! Your device has been registered.` });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;