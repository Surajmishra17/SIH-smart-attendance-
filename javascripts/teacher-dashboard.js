// javascripts/teacher-dashboard.js
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Mobile Menu Logic ---
    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('menu-overlay');

    if (menuBtn && sidebar && overlay) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
            overlay.classList.toggle('hidden');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        });
    }

    // --- 2. Element Selectors ---
    const addClassForm = document.getElementById('add-class-form');
    const classList = document.getElementById('class-list');

    // QR Code Modal Elements
    const qrCodeModal = document.getElementById('qr-code-modal');
    const closeQrModal = document.getElementById('close-qr-modal');
    const qrcodeContainer = document.getElementById('qrcode');
    const qrTimer = document.getElementById('qr-timer');

    // Student Management Modal Elements
    const studentModal = document.getElementById('student-modal');
    const closeStudentModalBtn = document.getElementById('close-student-modal');
    const studentListContainer = document.getElementById('student-list-container');

    // Device Reset Confirmation Modal Elements
    const resetConfirmModal = document.getElementById('reset-confirm-modal');
    const cancelResetBtn = document.getElementById('cancel-reset-btn');
    const confirmResetBtn = document.getElementById('confirm-reset-btn');

    // Manual Attendance Modal Elements
    const manualModal = document.getElementById('manual-attendance-modal');
    const closeManualModal = document.getElementById('close-manual-modal');
    const manualDatePicker = document.getElementById('manual-date-picker');
    const manualStudentList = document.getElementById('manual-student-list');
    const saveManualBtn = document.getElementById('save-manual-attendance');
    const manualSubjectTitle = document.getElementById('manual-subject-title');

    // --- 3. State Variables ---
    let qrCodeInstance = null;
    let timerInterval = null;      // 120s session countdown
    let qrRefreshInterval = null;  // 5s QR rotation
    let studentIdToReset = null;   // ID of student to reset
    let buttonToUpdate = null;     // Button UI reference to update after reset
    let currentManualSubjectId = null; // Subject ID for manual attendance

    // --- 4. Helper: Notifications ---
    function showNotification(message, type) {
        const notification = document.getElementById('notification');
        const notificationMessage = document.getElementById('notification-message');
        notification.className = 'p-4 mb-4 text-sm rounded-lg';
        if (type === 'success') {
            notification.classList.add('bg-green-100', 'text-green-800');
        } else {
            notification.classList.add('bg-red-100', 'text-red-800');
        }
        notificationMessage.textContent = message;
        notification.classList.remove('hidden');
        setTimeout(() => notification.classList.add('hidden'), 3000);
    }

    // --- 5. Class & Subject Management ---

    // Add Class
    if (addClassForm) {
        addClassForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const className = e.target.elements.className.value;
            const response = await fetch('/dashboard/teacher/class', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ className })
            });
            const result = await response.json();
            showNotification(result.message, result.success ? 'success' : 'error');
            if (result.success) {
                setTimeout(() => location.reload(), 500);
            }
        });
    }

    // Main List Event Listener (Bubbling)
    if (classList) {
        // Handle "Add Subject" Form Submission
        classList.addEventListener('submit', async (e) => {
            if (e.target.classList.contains('add-subject-form')) {
                e.preventDefault();
                const form = e.target;
                const classId = form.dataset.classId;
                const subjectName = form.elements.subjectName.value;
                form.elements.subjectName.value = ''; // Clear input
                await addSubject(classId, subjectName);
            }
        });

        // Handle Clicks (Delete, QR, Manage Students, Manual Attendance)
        classList.addEventListener('click', (e) => {
            const deleteClassBtn = e.target.closest('.delete-class-btn');
            const generateQrBtn = e.target.closest('.generate-qr-btn');
            const deleteSubjectBtn = e.target.closest('.delete-subject-btn');
            const manageStudentsBtn = e.target.closest('.manage-students-btn');
            const manualBtn = e.target.closest('.manual-attendance-btn');

            // Delete Class
            if (deleteClassBtn) {
                const classId = deleteClassBtn.dataset.classId;
                if (confirm('Are you sure you want to delete this entire class and all its subjects?')) {
                    deleteClass(classId);
                }
                return;
            }

            // Generate QR
            if (generateQrBtn) {
                const subjectId = generateQrBtn.dataset.subjectId;
                generateQrCode(subjectId);
                return;
            }

            // Delete Subject
            if (deleteSubjectBtn) {
                const subjectId = deleteSubjectBtn.dataset.subjectId;
                if (confirm('Are you sure you want to delete this subject?')) {
                    deleteSubject(subjectId);
                }
                return;
            }

            // Manage Students
            if (manageStudentsBtn) {
                const students = JSON.parse(manageStudentsBtn.dataset.students);
                openStudentModal(students);
                return;
            }

            // Manual Attendance
            if (manualBtn) {
                currentManualSubjectId = manualBtn.dataset.subjectId;
                const subjectName = manualBtn.dataset.subjectName;
                manualSubjectTitle.textContent = `Manual Attendance: ${subjectName}`;

                // Set date picker to today and load data
                if (manualDatePicker) {
                    manualDatePicker.valueAsDate = new Date();
                    loadManualData(currentManualSubjectId, manualDatePicker.value);
                }
                manualModal.classList.remove('hidden');
                return;
            }
        });
    }

    // --- API Action Functions ---

    async function addSubject(classId, subjectName) {
        const response = await fetch(`/dashboard/teacher/class/${classId}/subject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subjectName })
        });
        const result = await response.json();
        showNotification(result.message, result.success ? 'success' : 'error');
        if (result.success) setTimeout(() => location.reload(), 500);
    }

    async function deleteClass(classId) {
        const response = await fetch(`/dashboard/teacher/class/${classId}`, { method: 'DELETE' });
        const result = await response.json();
        showNotification(result.message, result.success ? 'success' : 'error');
        if (result.success) setTimeout(() => location.reload(), 500);
    }

    async function deleteSubject(subjectId) {
        const response = await fetch(`/dashboard/teacher/subject/${subjectId}`, { method: 'DELETE' });
        const result = await response.json();
        showNotification(result.message, result.success ? 'success' : 'error');
        if (result.success) setTimeout(() => location.reload(), 500);
    }

    // --- 6. Dynamic QR Code Logic (Anti-Proxy) ---

    function generateQrCode(subjectId) {
        // Reset state
        qrcodeContainer.innerHTML = '';
        if (timerInterval) clearInterval(timerInterval);
        if (qrRefreshInterval) clearInterval(qrRefreshInterval);

        // Update function: Generates a new QR with current timestamp
        const updateQR = () => {
            qrcodeContainer.innerHTML = ''; // Clear old QR
            const qrData = JSON.stringify({
                subjectId: subjectId,
                timestamp: Date.now()
            });

            qrCodeInstance = new QRCode(qrcodeContainer, {
                text: qrData,
                width: 256,
                height: 256,
                correctLevel: QRCode.CorrectLevel.H
            });
        };

        // 1. Initial Generate
        updateQR();

        // 2. Rotate every 5 seconds
        qrRefreshInterval = setInterval(updateQR, 5000);

        // 3. Session Countdown (120 seconds)
        let timeLeft = 120;
        qrTimer.innerHTML = `Session Active.<br>QR Code rotates every 5s.<br>Time Remaining: ${timeLeft}s`;

        timerInterval = setInterval(() => {
            timeLeft--;
            qrTimer.innerHTML = `Session Active.<br>QR Code rotates every 5s.<br>Time Remaining: ${timeLeft}s`;

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                clearInterval(qrRefreshInterval);
                qrTimer.textContent = 'Session Expired.';
                qrcodeContainer.innerHTML = '<p class="text-red-500 font-bold p-10">Expired</p>';
                setTimeout(() => qrCodeModal.classList.add('hidden'), 2000);
            }
        }, 1000);

        qrCodeModal.classList.remove('hidden');
    }

    // Close QR Modal
    if (closeQrModal) {
        closeQrModal.addEventListener('click', () => {
            qrCodeModal.classList.add('hidden');
            clearInterval(timerInterval);
            clearInterval(qrRefreshInterval);
            qrcodeContainer.innerHTML = '';
        });
    }

    // --- 7. Student Management (Device Lock Reset) ---

    function openStudentModal(students) {
        studentListContainer.innerHTML = '';

        if (!students || students.length === 0) {
            studentListContainer.innerHTML = '<p class="text-gray-500 text-center py-4">No students in this class yet.</p>';
        } else {
            students.forEach(student => {
                const isLocked = !!student.deviceId;
                const studentEl = document.createElement('div');
                studentEl.className = 'flex justify-between items-center p-3 bg-slate-50 rounded border';
                studentEl.innerHTML = `
                    <div>
                        <p class="font-semibold text-slate-800">${student.name}</p>
                        <p class="text-sm text-slate-500">${student.email}</p>
                    </div>
                    <div>
                        ${isLocked
                        ? `<button class="reset-device-btn bg-orange-100 text-orange-700 px-3 py-1 rounded text-sm font-medium hover:bg-orange-200" 
                                 data-student-id="${student._id}">
                                 Reset Device Lock
                               </button>`
                        : `<span class="text-green-600 text-xs font-semibold bg-green-100 px-2 py-1 rounded">No Lock Active</span>`
                    }
                    </div>
                `;
                studentListContainer.appendChild(studentEl);
            });
        }
        studentModal.classList.remove('hidden');
    }

    if (closeStudentModalBtn) {
        closeStudentModalBtn.addEventListener('click', () => studentModal.classList.add('hidden'));
    }

    // Handle Reset Click (Delegation inside modal)
    if (studentListContainer) {
        studentListContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.reset-device-btn');
            if (!btn) return;

            studentIdToReset = btn.dataset.studentId;
            buttonToUpdate = btn; // Save reference to update UI later

            // Show Confirmation Modal
            resetConfirmModal.classList.remove('hidden');
        });
    }

    // --- 8. Reset Confirmation Modal Logic ---

    if (confirmResetBtn) {
        confirmResetBtn.addEventListener('click', async () => {
            if (!studentIdToReset) return;

            const originalText = confirmResetBtn.textContent;
            confirmResetBtn.textContent = "Processing...";
            confirmResetBtn.disabled = true;

            try {
                const response = await fetch('/dashboard/teacher/reset-device', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId: studentIdToReset })
                });

                const result = await response.json();

                if (result.success) {
                    if (buttonToUpdate) {
                        buttonToUpdate.className = "text-green-600 text-xs font-semibold bg-green-100 px-2 py-1 rounded";
                        buttonToUpdate.textContent = "Reset Successful";
                        buttonToUpdate.disabled = true;
                    }
                    showNotification("Device lock reset successfully!", "success");
                } else {
                    showNotification("Failed: " + result.message, "error");
                }
            } catch (err) {
                console.error(err);
                showNotification("Server Error occurred", "error");
            } finally {
                resetConfirmModal.classList.add('hidden');
                confirmResetBtn.textContent = originalText;
                confirmResetBtn.disabled = false;
                studentIdToReset = null;
                buttonToUpdate = null;
            }
        });
    }

    if (cancelResetBtn) {
        cancelResetBtn.addEventListener('click', () => {
            resetConfirmModal.classList.add('hidden');
            studentIdToReset = null;
            buttonToUpdate = null;
        });
    }

    // --- 9. Manual Attendance Logic ---

    async function loadManualData(subjectId, date) {
        manualStudentList.innerHTML = '<p class="text-center text-gray-500 py-4">Loading...</p>';
        try {
            const response = await fetch(`/dashboard/teacher/attendance/manual/${subjectId}?date=${date}`);
            const result = await response.json();

            if (result.success) {
                manualStudentList.innerHTML = '';
                if (result.students.length === 0) {
                    manualStudentList.innerHTML = '<p class="text-center text-gray-500">No students in this class.</p>';
                    return;
                }

                result.students.forEach(student => {
                    const div = document.createElement('div');
                    div.className = 'flex items-center justify-between p-3 bg-white border rounded shadow-sm';
                    div.innerHTML = `
                        <div>
                            <p class="font-medium text-gray-800">${student.name}</p>
                            <p class="text-xs text-gray-500">${student.email}</p>
                        </div>
                        <label class="inline-flex items-center">
                            <input type="checkbox" class="manual-check form-checkbox h-5 w-5 text-indigo-600" 
                                data-student-id="${student._id}" ${student.isPresent ? 'checked' : ''}>
                            <span class="ml-2 text-sm text-gray-700">Present</span>
                        </label>
                    `;
                    manualStudentList.appendChild(div);
                });
            }
        } catch (error) {
            console.error(error);
            manualStudentList.innerHTML = '<p class="text-red-500 text-center">Error loading data.</p>';
        }
    }

    // Date Picker Change Event
    if (manualDatePicker) {
        manualDatePicker.addEventListener('change', () => {
            if (currentManualSubjectId) {
                loadManualData(currentManualSubjectId, manualDatePicker.value);
            }
        });
    }

    // Save Manual Attendance
    if (saveManualBtn) {
        saveManualBtn.addEventListener('click', async () => {
            const checkboxes = document.querySelectorAll('.manual-check');
            const studentsData = Array.from(checkboxes).map(cb => ({
                studentId: cb.dataset.studentId,
                isPresent: cb.checked
            }));

            const originalText = saveManualBtn.textContent;
            saveManualBtn.disabled = true;
            saveManualBtn.textContent = 'Saving...';

            try {
                const response = await fetch('/dashboard/teacher/attendance/manual', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        subjectId: currentManualSubjectId,
                        date: manualDatePicker.value,
                        students: studentsData
                    })
                });
                const result = await response.json();

                if (result.success) {
                    showNotification("Attendance updated successfully!", "success");
                    manualModal.classList.add('hidden');
                } else {
                    showNotification("Error: " + result.message, "error");
                }
            } catch (err) {
                showNotification("Server error.", "error");
            } finally {
                saveManualBtn.disabled = false;
                saveManualBtn.textContent = originalText;
            }
        });
    }

    if (closeManualModal) {
        closeManualModal.addEventListener('click', () => manualModal.classList.add('hidden'));
    }

});