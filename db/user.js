const mongoose = require('mongoose');

// This is the connection string for your MongoDB database.
// 'attenSysDb' will be the name of the database created in MongoDB.
const dbURI = 'mongodb+srv://reachtanish:Tanish123@cluster0.0jq9vh4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

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
