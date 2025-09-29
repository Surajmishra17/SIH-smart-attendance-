const express = require('express');
const router = express.Router();
const Class = require('../models/classmodel');
const Attendance = require('../models/attendancemodel');
const User = require('../models/usermodel.js');

// Middleware to ensure a user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/login-signup');
};

// **NEW MIDDLEWARE TO PREVENT BROWSER CACHING**
const noCache = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '-1');
    next();
};

// **APPLY MIDDLEWARE TO ALL ROUTES IN THIS FILE**
// Any user trying to access these routes must be authenticated and will get no-cache headers.
router.use(isAuthenticated, noCache);


router.get('/student', async (req, res) => {
    try {
        const studentId = req.session.userId;
        const classes = await Class.find({ students: studentId }).populate('teacher', 'name');
        const attendance = await Attendance.find({ student: studentId }).populate('class', 'name');

        res.render('student-dashboard', {
            classes,
            attendance
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.post('/student/class', async (req, res) => {
    try {
        const { className } = req.body;
        const studentId = req.session.userId;

        const newClass = new Class({
            name: className,
            students: [studentId]
        });

        await newClass.save();
        res.status(201).json({ success: true, message: 'Class added successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

router.post('/student/attendance', async (req, res) => {
    try {
        const { classId, qrCodeData } = req.body;
        const studentId = req.session.userId;

        if (qrCodeData) {
            const newAttendance = new Attendance({
                class: classId,
                student: studentId,
                status: 'present'
            });
            await newAttendance.save();
            res.json({ success: true, message: 'Attendance marked as present!' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid QR Code' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

router.delete('/student/class/:classId', async (req, res) => {
    try {
        const { classId } = req.params;
        const studentId = req.session.userId;

        await Class.updateOne({ _id: classId }, { $pull: { students: studentId } });

        res.json({ success: true, message: 'Class removed successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;