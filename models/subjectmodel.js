// models/subjectmodel.js
const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    // Link to the parent class (the "Group")
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class'
    },
    // Keep track of who teaches this subject (inherited from the class)
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

module.exports = mongoose.model('Subject', SubjectSchema);