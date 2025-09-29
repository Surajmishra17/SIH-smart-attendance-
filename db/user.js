const mongoose = require('mongoose');

// This is the connection string for your MongoDB database.
// 'attenSysDb' will be the name of the database created in MongoDB.
const dbURI = 'mongodb://127.0.0.1:27017/attenSysDb';

const connectDB = async () => {
    try {
        await mongoose.connect(dbURI);
        console.log('MongoDB connected successfully!');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        // Exit process with failure
        process.exit(1);
    }
};

module.exports = connectDB;
