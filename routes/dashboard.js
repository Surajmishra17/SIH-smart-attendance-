// routes/dashboard.js
const express = require('express');
const router = express.Router();
const Class = require('../models/classmodel');
const Subject = require('../models/subjectmodel');
const Attendance = require('../models/attendancemodel');
const User = require('../models/usermodel.js');
const qrcode = require('qrcode');

// Middleware
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/login-signup');
};

const noCache = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '-1');
    next();
};

router.use(isAuthenticated, noCache);

// --- STUDENT ROUTES ---
// (Student routes remain unchanged, including join-class, attendance, etc.)
router.get('/student', async (req, res) => {
    try {
        const studentId = req.session.userId;
        const classes = await Class.find({ students: studentId })
            .populate('teacher', 'name')
            .populate('subjects');

        const subjectStats = {};
        for (const classItem of classes) {
            for (const subject of classItem.subjects) {
                const myAttendanceCount = await Attendance.countDocuments({
                    subject: subject._id,
                    student: studentId,
                    status: 'present'
                });
                const totalClassesRaw = await Attendance.aggregate([
                    { $match: { subject: subject._id } },
                    { $group: { _id: { year: { $year: "$date" }, month: { $month: "$date" }, day: { $dayOfMonth: "$date" } } } },
                    { $count: "count" }
                ]);
                const totalClasses = totalClassesRaw.length > 0 ? totalClassesRaw[0].count : 0;
                let percentage = 0;
                if (totalClasses > 0) percentage = Math.round((myAttendanceCount / totalClasses) * 100);
                subjectStats[subject._id] = { present: myAttendanceCount, total: totalClasses, percentage: percentage };
            }
        }

        const attendance = await Attendance.find({ student: studentId })
            .populate({ path: 'subject', select: 'name' })
            .sort({ date: 'desc' });

        const attendanceByDate = {};
        attendance.forEach(att => {
            const dateString = new Date(att.date).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
            });
            if (!attendanceByDate[dateString]) attendanceByDate[dateString] = [];
            attendanceByDate[dateString].push({
                subjectName: att.subject ? att.subject.name : 'Deleted Subject',
                status: att.status
            });
        });

        res.render('student-dashboard', { classes, attendanceByDate, subjectStats });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
// ... (Other student routes: join-class, attendance, delete class remain same)
router.post('/student/join-class', async (req, res) => {
    try {
        const { classId } = req.body;
        const studentId = req.session.userId;
        const updatedClass = await Class.findByIdAndUpdate(
            classId,
            { $addToSet: { students: studentId } },
            { new: true }
        );
        if (!updatedClass) return res.status(404).json({ success: false, message: 'Class not found.' });
        res.status(201).json({ success: true, message: 'Joined class successfully!' });
    } catch (err) {
        if (err.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid Class ID format.' });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

router.post('/student/attendance', async (req, res) => {
    try {
        const { subjectId, qrCodeData } = req.body;
        const studentId = req.session.userId;

        let parsedQrData;
        try { parsedQrData = JSON.parse(qrCodeData); } catch (e) { return res.status(400).json({ success: false, message: 'Invalid QR Data.' }); }

        if (parsedQrData.subjectId !== subjectId) return res.status(400).json({ success: false, message: 'Invalid or mismatched QR Code.' });

        const qrTimestamp = parsedQrData.timestamp;
        const timeDiffSeconds = (Date.now() - qrTimestamp) / 1000;
        if (timeDiffSeconds > 5) return res.status(400).json({ success: false, message: 'QR Code Expired. Scan the live code.' });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingAttendance = await Attendance.findOne({
            subject: subjectId,
            student: studentId,
            date: { $gte: today }
        });

        if (existingAttendance) return res.status(400).json({ success: false, message: 'Attendance already marked today.' });

        const newAttendance = new Attendance({ subject: subjectId, student: studentId, status: 'present' });
        await newAttendance.save();
        res.json({ success: true, message: 'Attendance marked!' });
    } catch (err) { res.status(500).json({ success: false, message: 'Server Error' }); }
});

router.delete('/student/class/:classId', async (req, res) => {
    try {
        const { classId } = req.params;
        const studentId = req.session.userId;
        await Class.updateOne({ _id: classId }, { $pull: { students: studentId } });
        res.json({ success: true, message: 'You have left the class.' });
    } catch (err) { res.status(500).json({ success: false, message: 'Server Error' }); }
});


// --- TEACHER ROUTES ---

router.get('/teacher', async (req, res) => {
    try {
        const teacherId = req.session.userId;
        const classes = await Class.find({ teacher: teacherId })
            .populate('subjects')
            // [MODIFIED] Populate deviceResetRequested to check for flags
            .populate('students', 'name email deviceId deviceResetRequested');

        // [NEW] Aggregate Unique Reset Requests for the Dashboard Notification
        const requestMap = new Map();
        classes.forEach(c => {
            if (c.students) {
                c.students.forEach(s => {
                    if (s.deviceResetRequested) {
                        requestMap.set(s._id.toString(), s);
                    }
                });
            }
        });
        const resetRequests = Array.from(requestMap.values());

        res.render('teacher-dashboard', { classes, resetRequests });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// ... (Manual attendance routes remain same) ...
router.get('/teacher/attendance/manual/:subjectId', async (req, res) => {
    try {
        const { subjectId } = req.params;
        const { date } = req.query;
        const subject = await Subject.findById(subjectId).populate('class');
        if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
        const allStudents = await Class.findById(subject.class._id).populate('students', 'name email');
        const queryDate = new Date(date);
        const startOfDay = new Date(queryDate.setUTCHours(0, 0, 0, 0));
        const endOfDay = new Date(queryDate.setUTCHours(23, 59, 59, 999));
        const existingRecords = await Attendance.find({
            subject: subjectId,
            date: { $gte: startOfDay, $lte: endOfDay },
            status: 'present'
        });
        const presentStudentIds = new Set(existingRecords.map(r => r.student.toString()));
        const studentList = allStudents.students.map(student => ({
            _id: student._id,
            name: student.name,
            email: student.email,
            isPresent: presentStudentIds.has(student._id.toString())
        }));
        res.json({ success: true, students: studentList });
    } catch (err) { res.status(500).json({ success: false, message: 'Server Error' }); }
});

router.post('/teacher/attendance/manual', async (req, res) => {
    try {
        const { subjectId, date, students } = req.body;
        const targetDate = new Date(date);
        for (const s of students) {
            const startOfDay = new Date(new Date(date).setUTCHours(0, 0, 0, 0));
            const endOfDay = new Date(new Date(date).setUTCHours(23, 59, 59, 999));
            if (s.isPresent) {
                await Attendance.findOneAndUpdate(
                    { subject: subjectId, student: s.studentId, date: { $gte: startOfDay, $lte: endOfDay } },
                    { subject: subjectId, student: s.studentId, date: targetDate, status: 'present' },
                    { upsert: true, new: true }
                );
            } else {
                await Attendance.findOneAndDelete({
                    subject: subjectId, student: s.studentId, date: { $gte: startOfDay, $lte: endOfDay }
                });
            }
        }
        res.json({ success: true, message: 'Attendance updated successfully.' });
    } catch (err) { res.status(500).json({ success: false, message: 'Server Error' }); }
});

router.post('/teacher/class', async (req, res) => {
    try {
        const { className } = req.body;
        const newClass = new Class({ name: className, teacher: req.session.userId });
        await newClass.save();
        res.status(201).json({ success: true, message: 'Class created!', newClass });
    } catch (err) { res.status(500).json({ success: false, message: 'Error' }); }
});

router.post('/teacher/class/:classId/subject', async (req, res) => {
    try {
        const { classId } = req.params;
        const { subjectName } = req.body;
        const newSubject = new Subject({ name: subjectName, class: classId, teacher: req.session.userId });
        await newSubject.save();
        await Class.findByIdAndUpdate(classId, { $push: { subjects: newSubject._id } });
        res.status(201).json({ success: true, message: 'Subject added!', newSubject });
    } catch (err) { res.status(500).json({ success: false, message: 'Error' }); }
});

// [MODIFIED] Teacher Approval for Device Reset
router.post('/teacher/reset-device', async (req, res) => {
    try {
        const { studentId } = req.body;
        // Reset deviceId AND clear the request flag
        await User.findByIdAndUpdate(studentId, {
            $set: {
                deviceId: null,
                deviceResetRequested: false
            }
        });
        res.json({ success: true, message: 'Device lock reset approved.' });
    } catch (err) { res.status(500).json({ success: false, message: 'Error' }); }
});

// ... (Delete and report routes remain same)
router.delete('/teacher/class/:classId', async (req, res) => {
    try {
        const { classId } = req.params;
        const classToDelete = await Class.findById(classId);
        if (classToDelete) {
            await Subject.deleteMany({ _id: { $in: classToDelete.subjects } });
            await Attendance.deleteMany({ subject: { $in: classToDelete.subjects } });
        }
        await Class.findByIdAndDelete(classId);
        res.json({ success: true, message: 'Class deleted.' });
    } catch (err) { res.status(500).json({ success: false, message: 'Error' }); }
});

router.delete('/teacher/subject/:subjectId', async (req, res) => {
    try {
        const { subjectId } = req.params;
        const subjectToDelete = await Subject.findById(subjectId);
        if (subjectToDelete) {
            await Class.findByIdAndUpdate(subjectToDelete.class, { $pull: { subjects: subjectId } });
        }
        await Attendance.deleteMany({ subject: subjectId });
        await Subject.findByIdAndDelete(subjectId);
        res.json({ success: true, message: 'Subject deleted.' });
    } catch (err) { res.status(500).json({ success: false, message: 'Error' }); }
});

router.post('/teacher/generate-qr', async (req, res) => {
    try {
        const { subjectId } = req.body;
        const qrData = JSON.stringify({ subjectId: subjectId, timestamp: Date.now() });
        res.json({ success: true, qrData: qrData });
    } catch (err) { res.status(500).json({ success: false, message: 'Error' }); }
});

router.get('/teacher/subject/:subjectId/attendance-report', async (req, res) => {
    try {
        const { subjectId } = req.params;
        const subject = await Subject.findById(subjectId);
        if (!subject) return res.status(404).send('Subject not found');

        const attendanceRecords = await Attendance.find({ subject: subjectId, status: 'present' })
            .populate('student', 'name email')
            .sort({ date: 'desc' });

        const attendanceByDate = {};
        attendanceRecords.forEach(att => {
            const dateString = new Date(att.date).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
            });
            if (!attendanceByDate[dateString]) attendanceByDate[dateString] = [];
            if (att.student) attendanceByDate[dateString].push(att.student);
        });

        res.render('subject-attendance', { subject, attendanceByDate });
    } catch (err) { res.status(500).json({ success: false, message: 'Error' }); }
});

router.get('/teacher/subject/:subjectId/export', async (req, res) => {
    try {
        const { subjectId } = req.params;
        const subject = await Subject.findById(subjectId);
        if (!subject) return res.status(404).send('Subject not found');

        const records = await Attendance.find({ subject: subjectId, status: 'present' })
            .populate('student', 'name email').sort({ date: 'desc' });

        let csvContent = "Date,Student Name,Student Email,Status\n";
        records.forEach(record => {
            if (record.student) {
                const date = new Date(record.date).toLocaleDateString('en-US');
                const name = `"${record.student.name.replace(/"/g, '""')}"`;
                csvContent += `${date},${name},${record.student.email},${record.status}\n`;
            }
        });

        const filename = `${subject.name.replace(/[^a-zA-Z0-9]/g, '_')}_Attendance.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
    } catch (err) { res.status(500).send('Error'); }
});

module.exports = router;