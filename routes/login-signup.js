const express = require('express');
const router = express.Router();

// This route still shows the login/signup page
router.get('/', (req, res) => {
    res.render('login-signup');
});

// FIX: Added a new route to handle LOGIN form submissions.
router.post('/login', (req, res) => {
    const { email, password, role } = req.body;

    // In a real application, you would look up the user in a database here.
    console.log('--- Login Attempt ---');
    console.log(`Role: ${role}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('---------------------');

    // Send a success response back to the browser.
    res.json({ success: true, message: `Login successful as ${role}!` });
});

// FIX: Added a new route to handle SIGN UP form submissions.
router.post('/signup', (req, res) => {
    const { name, email, password, role } = req.body;

    // In a real application, you would create a new user in a database here.
    console.log('--- New User Signup ---');
    console.log(`Role: ${role}`);
    console.log(`Name: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('-----------------------');

    // Send a success response back to the browser.
    res.json({ success: true, message: `Account created for ${name} as a ${role}!` });
});


module.exports = router;
