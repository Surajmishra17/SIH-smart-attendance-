// routes/settings.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/usermodel');

// Middleware to check if logged in
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/login-signup');
};

router.use(isAuthenticated);

// GET: Render Settings Page
router.get('/', async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        res.render('settings', {
            user,
            successMessage: req.query.success,
            errorMessage: req.query.error
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// POST: Change Password
router.post('/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmNewPassword } = req.body;
        const user = await User.findById(req.session.userId);

        // 1. Check if new passwords match
        if (newPassword !== confirmNewPassword) {
            return res.redirect('/settings?error=New passwords do not match');
        }

        // 2. Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.redirect('/settings?error=Incorrect current password');
        }

        // 3. Update password
        user.password = newPassword;
        await user.save();

        res.redirect('/settings?success=Password updated successfully');
    } catch (err) {
        console.error(err);
        res.redirect('/settings?error=Server Error');
    }
});

// POST: Request Device Reset (Student Side)
router.post('/reset-device', async (req, res) => {
    try {
        const { passwordConfirm } = req.body;
        const user = await User.findById(req.session.userId);

        // Security Check
        const isMatch = await bcrypt.compare(passwordConfirm, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Incorrect password.' });
        }

        // [MODIFIED] Set flag instead of clearing deviceId
        user.deviceResetRequested = true;
        await user.save();

        res.json({ success: true, message: 'Unlink request sent to your teachers. Please wait for approval.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;