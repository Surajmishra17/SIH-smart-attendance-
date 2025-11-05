// javascripts/teacher-dashboard.js
document.addEventListener('DOMContentLoaded', () => {

    // --- NEW Mobile Menu Logic ---
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
    // --- End of new logic ---

    const addClassForm = document.getElementById('add-class-form');
    const classList = document.getElementById('class-list');

    // QR Modal
    const qrCodeModal = document.getElementById('qr-code-modal');
    const closeQrModal = document.getElementById('close-qr-modal');
    const qrcodeContainer = document.getElementById('qrcode');
    const qrTimer = document.getElementById('qr-timer');
    let qrCodeInstance = null;
    let timerInterval = null;

    // Notification helper
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

    // --- Event Listeners ---

    // 1. Add a new class (Group)
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

    // 2. Handle events inside the main class list area
    if (classList) {

        // **FIX**: Listen for SUBMIT events (for adding subjects)
        classList.addEventListener('submit', async (e) => {
            // Check if the submission came from an "add-subject-form"
            if (e.target.classList.contains('add-subject-form')) {
                e.preventDefault(); // Stop form from reloading page
                const form = e.target;
                const classId = form.dataset.classId;
                const subjectName = form.elements.subjectName.value;

                // Clear the input field immediately
                form.elements.subjectName.value = '';

                await addSubject(classId, subjectName);
            }
        });

        // **FIX**: Listen for CLICK events (for all buttons)
        classList.addEventListener('click', (e) => {
            // Find the closest button that was clicked
            const deleteClassBtn = e.target.closest('.delete-class-btn');
            const generateQrBtn = e.target.closest('.generate-qr-btn');
            const deleteSubjectBtn = e.target.closest('.delete-subject-btn');

            // Delete Class
            if (deleteClassBtn) {
                const classId = deleteClassBtn.dataset.classId;
                if (confirm('Are you sure you want to delete this entire class and all its subjects? This cannot be undone.')) {
                    deleteClass(classId);
                }
                return; // Stop further checks
            }

            // Generate QR for Subject
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
        });
    }

    // --- Modal Closers ---
    closeQrModal.addEventListener('click', () => {
        qrCodeModal.classList.add('hidden');
        clearInterval(timerInterval);
    });

    // --- Helper Functions ---

    // Add a new Subject to a Class
    async function addSubject(classId, subjectName) {
        const response = await fetch(`/dashboard/teacher/class/${classId}/subject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subjectName })
        });
        const result = await response.json();
        showNotification(result.message, result.success ? 'success' : 'error');
        if (result.success) {
            setTimeout(() => location.reload(), 500);
        }
    }

    // Delete a Class
    async function deleteClass(classId) {
        const response = await fetch(`/dashboard/teacher/class/${classId}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        showNotification(result.message, result.success ? 'success' : 'error');
        if (result.success) {
            setTimeout(() => location.reload(), 500);
        }
    }

    // Delete a Subject
    async function deleteSubject(subjectId) {
        const response = await fetch(`/dashboard/teacher/subject/${subjectId}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        showNotification(result.message, result.success ? 'success' : 'error');
        if (result.success) {
            setTimeout(() => location.reload(), 500);
        }
    }

    // Generate QR for a Subject
    async function generateQrCode(subjectId) {
        const response = await fetch('/dashboard/teacher/generate-qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subjectId }) // Send subjectId
        });
        const result = await response.json();
        if (result.success) {
            qrcodeContainer.innerHTML = '';
            qrCodeInstance = new QRCode(qrcodeContainer, {
                text: result.qrData,
                width: 256,
                height: 256,
            });

            // Timer
            let timeLeft = 30; // 30 seconds
            qrTimer.textContent = `QR code will expire in ${timeLeft} seconds.`;
            clearInterval(timerInterval); // Clear any existing timer
            timerInterval = setInterval(() => {
                timeLeft--;
                qrTimer.textContent = `QR code will expire in ${timeLeft} seconds.`;
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    qrTimer.textContent = 'QR code has expired.';
                    qrcodeContainer.innerHTML = '<p class="text-red-500 font-bold p-10">Expired</p>';
                }
            }, 1000);

            qrCodeModal.classList.remove('hidden');
        } else {
            showNotification(result.message, 'error');
        }
    }
});