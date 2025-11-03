const dotenv = require('dotenv');
dotenv.config();
const express = require('express')
const app = express()
const path = require('path')
const details = require('./routes/login-signup');
const dashboard = require('./routes/dashboard'); // Import dashboard routes
const session = require('express-session'); // For session management

app.set('view engine', 'ejs')
app.use(express.static(path.join(__dirname, 'public')))
app.use('/javascripts', express.static(path.join(__dirname, 'javascripts')))
app.use(express.urlencoded({ extended: true }));
app.use(express.json())

// Session middleware
app.use(session({
    secret: 'a-very-secret-key', // change this to a random string
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // for development; set to true in production with HTTPS
}));

app.get('/', (req, res) => {
    res.render('front')
})

app.use('/login-signup', details);
app.use('/dashboard', dashboard); // Use the dashboard routes

// NEW LOGOUT ROUTE
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            // Handle error case
            return res.redirect('/dashboard/student');
        }
        // Clear the session cookie
        res.clearCookie('connect.sid');
        // Redirect to the homepage after successful logout
        res.redirect('/');
    });
});


const connectDB = require('./db/user.js');
connectDB()
.then(() => {
    app.listen(process.env.PORT, () => {
        console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
})