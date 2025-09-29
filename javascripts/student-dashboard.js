document.addEventListener('DOMContentLoaded', () => {
    const addClassForm = document.getElementById('add-class-form');
    const classList = document.getElementById('class-list');
    const qrScannerModal = document.getElementById('qr-scanner-modal');
    const closeModal = document.getElementById('close-modal');
    let html5QrCode;

    // Elements for notifications and modals
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    let classIdToDelete = null;

    // Helper function to show on-page notifications
    function showNotification(message, type) {
        notification.className = 'p-4 mb-4 text-sm rounded-lg'; // Reset classes
        if (type === 'success') {
            notification.classList.add('bg-green-100', 'text-green-800');
        } else {
            notification.classList.add('bg-red-100', 'text-red-800');
        }
        notificationMessage.textContent = message;
        notification.classList.remove('hidden');

        // Automatically hide the notification after 3 seconds
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }

    addClassForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const className = e.target.elements.className.value;

        const response = await fetch('/dashboard/student/class', {
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

    // **MODIFIED EVENT LISTENER**
    classList.addEventListener('click', (e) => {
        // Use .closest() to find the button, no matter if you click the button or the icon inside it
        const scanBtn = e.target.closest('.scan-qr-btn');
        const deleteBtn = e.target.closest('.delete-class-btn');

        if (scanBtn) {
            const classId = scanBtn.dataset.classId;
            openQrScanner(classId);
        } else if (deleteBtn) {
            classIdToDelete = deleteBtn.dataset.classId;
            deleteConfirmModal.classList.remove('hidden');
        }
    });

    // Handle clicks on the final "Yes, Delete" button
    confirmDeleteBtn.addEventListener('click', () => {
        if (classIdToDelete) {
            deleteClass(classIdToDelete);
        }
        deleteConfirmModal.classList.add('hidden');
    });

    // Handle clicks on the "Cancel" button
    cancelDeleteBtn.addEventListener('click', () => {
        classIdToDelete = null;
        deleteConfirmModal.classList.add('hidden');
    });

    async function deleteClass(classId) {
        const response = await fetch(`/dashboard/student/class/${classId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        showNotification(result.message, result.success ? 'success' : 'error');
        if (result.success) {
            setTimeout(() => location.reload(), 500);
        }
    }

    function openQrScanner(classId) {
        qrScannerModal.classList.remove('hidden');
        html5QrCode = new Html5Qrcode("qr-scanner");
        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            html5QrCode.stop().then(ignore => {
                qrScannerModal.classList.add('hidden');
                markAttendance(classId, decodedText);
            }).catch(err => {
                console.error("Failed to stop QR scanner.", err);
            });
        };
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback);
    }

    closeModal.addEventListener('click', () => {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().catch(err => console.error("Failed to stop QR scanner on close.", err));
        }
        qrScannerModal.classList.add('hidden');
    });

    async function markAttendance(classId, qrCodeData) {
        const response = await fetch('/dashboard/student/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ classId, qrCodeData })
        });
        const result = await response.json();
        showNotification(result.message, result.success ? 'success' : 'error');
        if (result.success) {
            setTimeout(() => location.reload(), 500);
        }
    }
});