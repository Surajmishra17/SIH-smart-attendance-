// routes/dashboard.js
const express = require('express');
const router = express.Router();
const Class = require('../models/classmodel');
const Subject = require('../models/subjectmodel'); // Import new model
const Attendance = require('../models/attendancemodel');
const User = require('../models/usermodel.js');
const qrcode = require('qrcode');

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

router.use(isAuthenticated, noCache);


// --- STUDENT DASHBOARD ROUTES ---

// *** MODIFIED STUDENT ROUTE ***
router.get('/student', async (req, res) => {
    try {
        const studentId = req.session.userId;

        // 1. Find classes student is in (same as before)
        const classes = await Class.find({ students: studentId })
            .populate('teacher', 'name')
            .populate('subjects'); // <-- Populate subjects

        // 2. Find all attendance for this student
        const attendance = await Attendance.find({ student: studentId })
            .populate({
                path: 'subject', // Populate the subject for each attendance record
                select: 'name'
            })
            .sort({ date: 'desc' }); // Sort by most recent first

        // 3. *** NEW: Process attendance to group by date ***
        const attendanceByDate = {};
        attendance.forEach(att => {
            // Create a readable date string (e.g., "October 21, 2025")
            const dateString = new Date(att.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'UTC' // Use UTC to prevent day-shifting
            });

            // Create an array for this date if it doesn't exist
            if (!attendanceByDate[dateString]) {
                attendanceByDate[dateString] = [];
            }

            // Add the record details to the array for that date
            attendanceByDate[dateString].push({
                subjectName: att.subject ? att.subject.name : 'Deleted Subject',
                status: att.status
            });
        });

        // 4. Render the page, passing the new grouped object
        res.render('student-dashboard', {
            classes,
            attendanceByDate: attendanceByDate // Pass the new object
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// ... (rest of student POST/DELETE routes are unchanged) ...
router.post('/student/join-class', async (req, res) => {
    try {
        const { classId } = req.body; // Student will provide the Class ID
        const studentId = req.session.userId;

        // Find the class by its ID and add the student to the 'students' array
        const updatedClass = await Class.findByIdAndUpdate(
            classId,
            { $addToSet: { students: studentId } }, // $addToSet prevents duplicates
            { new: true }
        );

        if (!updatedClass) {
            return res.status(404).json({ success: false, message: 'Class not found.' });
        }

        res.status(201).json({ success: true, message: 'Joined class successfully!' });
    } catch (err) {
        console.error(err);
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid Class ID format.' });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

router.post('/student/attendance', async (req, res) => {
    try {
        const { subjectId, qrCodeData } = req.body; // Now expects subjectId
        const studentId = req.session.userId;

        // Basic check to see if QR data is valid (you can make this more secure)
        const parsedQrData = JSON.parse(qrCodeData);
        if (parsedQrData.subjectId !== subjectId) {
            return res.status(400).json({ success: false, message: 'Invalid or mismatched QR Code.' });
        }

        // Check if attendance already marked for this subject today
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day

        const existingAttendance = await Attendance.findOne({
            subject: subjectId,
            student: studentId,
            date: { $gte: today }
        });

        if (existingAttendance) {
            return res.status(400).json({ success: false, message: 'Attendance already marked for this subject today.' });
        }

        // Create new attendance record
        const newAttendance = new Attendance({
            subject: subjectId,
            student: studentId,
            status: 'present'
        });
        await newAttendance.save();
        res.json({ success: true, message: 'Attendance marked as present!' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

router.delete('/student/class/:classId', async (req, res) => {
    try {
        const { classId } = req.params;
        const studentId = req.session.userId;

        // Pull the student's ID from the 'students' array
        await Class.updateOne({ _id: classId }, { $pull: { students: studentId } });

        res.json({ success: true, message: 'You have left the class.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});


// --- TEACHER DASHBOARD ROUTES ---
// ... (All teacher routes remain unchanged) ...
router.get('/teacher', async (req, res) => {
    try {
        const teacherId = req.session.userId;
        // Find all classes taught by this teacher and populate their subjects
        const classes = await Class.find({ teacher: teacherId }).populate('subjects');
        res.render('teacher-dashboard', { classes });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.post('/teacher/class', async (req, res) => {
    try {
        const { className } = req.body;
        const teacherId = req.session.userId;
        const newClass = new Class({
            name: className,
            teacher: teacherId
        });
        await newClass.save();
        res.status(201).json({ success: true, message: 'Class created successfully!', newClass });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

router.post('/teacher/class/:classId/subject', async (req, res) => {
    try {
        const { classId } = req.params;
        const { subjectName } = req.body;
        const teacherId = req.session.userId;

        // Create the new subject
        const newSubject = new Subject({
            name: subjectName,
            class: classId,
            teacher: teacherId
        });
        await newSubject.save();

        // Add this subject to the parent class's 'subjects' array
        await Class.findByIdAndUpdate(classId, {
            $push: { subjects: newSubject._id }
        });

        res.status(201).json({ success: true, message: 'Subject added successfully!', newSubject });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to add subject' });
    }
});

router.delete('/teacher/class/:classId', async (req, res) => {
    try {
        const { classId } = req.params;

        // 1. Find the class to get its list of subjects
        const classToDelete = await Class.findById(classId);
        if (classToDelete) {
            // 2. Delete all subjects in this class
            await Subject.deleteMany({ _id: { $in: classToDelete.subjects } });

            // 3. Delete all attendance records for those subjects
            await Attendance.deleteMany({ subject: { $in: classToDelete.subjects } });
        }

        // 4. Delete the class itself
        await Class.findByIdAndDelete(classId);

        res.json({ success: true, message: 'Class and all its subjects deleted.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

router.delete('/teacher/subject/:subjectId', async (req, res) => {
    try {
        const { subjectId } = req.params;

        // 1. Find the subject to get its parent class ID
        const subjectToDelete = await Subject.findById(subjectId);
        if (subjectToDelete) {
            // 2. Remove the subject from its parent class's 'subjects' array
            await Class.findByIdAndUpdate(subjectToDelete.class, {
                $pull: { subjects: subjectId }
            });
        }

        // 3. Delete all attendance for this subject
        await Attendance.deleteMany({ subject: subjectId });

        // 4. Delete the subject itself
        await Subject.findByIdAndDelete(subjectId);

        res.json({ success: true, message: 'Subject deleted successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

router.post('/teacher/generate-qr', async (req, res) => {
    try {
        const { subjectId } = req.body; // Now expects subjectId
        // The data to be encoded in the QR code
        const qrData = JSON.stringify({
            subjectId: subjectId,
            timestamp: Date.now() // For time-sensitivity
        });
        res.json({ success: true, qrData: qrData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Could not generate QR code' });
    }
});

router.get('/teacher/subject/:subjectId/attendance-report', async (req, res) => {
    try {
        const { subjectId } = req.params;

        // 1. Get the Subject details
        const subject = await Subject.findById(subjectId);
        if (!subject) {
            return res.status(404).send('Subject not found');
        }

        // 2. Get all attendance for this subject, populated with student info
        const attendanceRecords = await Attendance.find({ subject: subjectId, status: 'present' })
            .populate('student', 'name email')
            .sort({ date: 'desc' }); // Sort by most recent first

        // 3. Group attendance by date
        const attendanceByDate = {};
        attendanceRecords.forEach(att => {
            // Use 'en-CA' (YYYY-MM-DD) for a consistent key, or toLocaleDateString for local format
            const dateString = new Date(att.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'UTC' // Use UTC to prevent day-shifting
            });

            if (!attendanceByDate[dateString]) {
                attendanceByDate[dateString] = [];
            }
            // Only add if student is populated
            if (att.student) {
                attendanceByDate[dateString].push(att.student);
            }
        });

        // 4. Render the new page with the grouped data
        res.render('subject-attendance', {
            subject: subject,
            attendanceByDate: attendanceByDate
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Could not fetch attendance' });
    }
});


module.exports = router;