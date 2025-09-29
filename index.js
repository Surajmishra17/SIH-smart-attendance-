const express = require('express')
const app = express()
const port = 3000
const path = require('path')
const details = require('./routes/login-signup');

app.set('view engine', 'ejs')
app.use(express.static(path.join(__dirname, 'public')))
app.use('/javascripts', express.static(path.join(__dirname, 'javascripts')))
app.use(express.urlencoded({ extended: true }));
app.use(express.json())

const connectDB = require('./db/user.js');
connectDB();

app.get('/', (req, res) => {
    res.render('front')
})

app.use('/login-signup', details);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
