// models/attendancemodel.js
const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    // MODIFIED: Changed from 'class' to 'subject'
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject', // Point to the new Subject model
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['present', 'absent'],
        required: true
    }
});

module.exports = mongoose.model('Attendance', AttendanceSchema);