// models/classmodel.js
const mongoose = require('mongoose');

const ClassSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // [CRITICAL FIX] This array was missing! 
    // It stores the list of students so we can manage their device locks.
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    subjects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
    }]
});

module.exports = mongoose.model('Class', ClassSchema);