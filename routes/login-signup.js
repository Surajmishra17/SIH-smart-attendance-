const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/usermodel.js');

router.get('/', (req, res) => {
    res.render('login-signup');
});

router.post('/login', async (req, res) => {
    const { email, password, role } = req.body;

    try {
        const user = await User.findOne({ email, role });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid credentials. Please check your email and role.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
        }

        // Set user session
        req.session.userId = user._id;

        // Redirect based on role
        if (role === 'student') {
            res.json({ success: true, message: `Welcome back, ${user.name}!`, redirectUrl: '/dashboard/student' });
        } else if (role === 'teacher') {
            // Placeholder for teacher dashboard
            res.json({ success: true, message: `Welcome back, ${user.name}!`, redirectUrl: '/dashboard/teacher' });
        }

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

router.post('/signup', async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        let user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
        }

        user = new User({
            name,
            email,
            password,
            role
        });

        await user.save();

        res.json({ success: true, message: `Account created for ${name}! You can now log in.` });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;