document.addEventListener('DOMContentLoaded', () => {
    const addClassForm = document.getElementById('add-class-form');
    const classList = document.getElementById('class-list');
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

    // Add a new class
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

    // Handle class list clicks for generating QR or deleting
    classList.addEventListener('click', (e) => {
        if (e.target.classList.contains('generate-qr-btn')) {
            const classId = e.target.dataset.classId;
            generateQrCode(classId);
        }
        if (e.target.classList.contains('delete-class-btn')) {
            const classId = e.target.dataset.classId;
            if (confirm('Are you sure you want to delete this class?')) {
                deleteClass(classId);
            }
        }
    });

    // Generate and display QR code
    async function generateQrCode(classId) {
        const response = await fetch('/dashboard/teacher/generate-qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ classId })
        });
        const result = await response.json();
        if (result.success) {
            qrcodeContainer.innerHTML = '';
            qrCodeInstance = new QRCode(qrcodeContainer, {
                text: result.qrData,
                width: 256,
                height: 256,
            });
            
            // Timer for QR code validity
            let timeLeft = 30; // 30 seconds
            qrTimer.textContent = `QR code will expire in ${timeLeft} seconds.`;
            timerInterval = setInterval(() => {
                timeLeft--;
                qrTimer.textContent = `QR code will expire in ${timeLeft} seconds.`;
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    qrTimer.textContent = 'QR code has expired.';
                    qrcodeContainer.innerHTML = '<p>Expired</p>';
                }
            }, 1000);

            qrCodeModal.classList.remove('hidden');
        } else {
            showNotification(result.message, 'error');
        }
    }

    // Delete a class
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
    
    // Close the QR code modal
    closeQrModal.addEventListener('click', () => {
        qrCodeModal.classList.add('hidden');
        clearInterval(timerInterval);
    });
});