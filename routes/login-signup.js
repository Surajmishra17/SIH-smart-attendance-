const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

// Import the User model to interact with the database
const User = require('../models/usermodel.js');

// This route still shows the login/signup page
router.get('/', (req, res) => {
    res.render('login-signup');
});

// UPDATED: Handles login with database validation
router.post('/login', async (req, res) => {
    const { email, password, role } = req.body;

    try {
        // Find a user with the matching email and role in the database
        const user = await User.findOne({ email, role });

        if (!user) {
            // If no user is found, send an error
            return res.status(400).json({ success: false, message: 'Invalid credentials. Please check your email and role.' });
        }

        // Compare the submitted password with the secure, hashed password in the database
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            // If passwords don't match, send an error
            return res.status(400).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
        }

        // If credentials are correct, send a success response
        res.json({ success: true, message: `Welcome back, ${user.name}!` });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// UPDATED: Handles signup and saves the new user to the database
router.post('/signup', async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        // Check if a user with the provided email already exists
        let user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
        }

        // If the user doesn't exist, create a new user instance
        user = new User({
            name,
            email,
            password,
            role
        });

        // Save the new user to the database (password will be auto-hashed by the model)
        await user.save();

        // Send a success response
        res.json({ success: true, message: `Account created for ${name}! You can now log in.` });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});


module.exports = router;

