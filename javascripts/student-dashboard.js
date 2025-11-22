// javascripts/student-dashboard.js
document.addEventListener('DOMContentLoaded', () => {

    // --- Mobile Menu Logic ---
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

    const joinClassForm = document.getElementById('join-class-form');
    const classList = document.getElementById('class-list');
    const qrScannerModal = document.getElementById('qr-scanner-modal');
    const closeModal = document.getElementById('close-modal');
    const scannerElement = document.getElementById("qr-scanner");
    let html5QrCode;
    let currentSubjectId = null;

    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    let classIdToDelete = null;

    function showNotification(message, type) {
        notification.className = 'p-4 mb-4 text-sm rounded-lg';
        if (type === 'success') {
            notification.classList.add('bg-green-100', 'text-green-800');
        } else {
            notification.classList.add('bg-red-100', 'text-red-800');
        }
        notificationMessage.textContent = message;
        notification.classList.remove('hidden');

        setTimeout(() => {
            notification.classList.add('hidden');
        }, 5000);
    }

    if (joinClassForm) {
        joinClassForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const classId = e.target.elements.classId.value;

            const response = await fetch('/dashboard/student/join-class', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classId })
            });

            const result = await response.json();
            showNotification(result.message, result.success ? 'success' : 'error');
            if (result.success) {
                setTimeout(() => location.reload(), 500);
            }
        });
    }

    if (classList) {
        classList.addEventListener('click', (e) => {
            const scanBtn = e.target.closest('.scan-qr-btn');
            const deleteBtn = e.target.closest('.delete-class-btn');

            if (scanBtn) {
                currentSubjectId = scanBtn.dataset.subjectId;
                openQrScanner();
            } else if (deleteBtn) {
                classIdToDelete = deleteBtn.dataset.classId;
                deleteConfirmModal.classList.remove('hidden');
            }
        });
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            if (classIdToDelete) {
                leaveClass(classIdToDelete);
            }
            deleteConfirmModal.classList.add('hidden');
        });
    }

    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
            classIdToDelete = null;
            deleteConfirmModal.classList.add('hidden');
        });
    }

    async function leaveClass(classId) {
        const response = await fetch(`/dashboard/student/class/${classId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        showNotification(result.message, result.success ? 'success' : 'error');
        if (result.success) {
            setTimeout(() => location.reload(), 500);
        }
    }

    function openQrScanner() {
        if (!currentSubjectId) return;

        qrScannerModal.classList.remove('hidden');
        scannerElement.innerHTML = "";
        html5QrCode = new Html5Qrcode("qr-scanner");

        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().then(ignore => {
                    qrScannerModal.classList.add('hidden');
                    markAttendance(currentSubjectId, decodedText);
                }).catch(err => console.error(err));
            }
        };

        html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: (w, h) => ({ width: 250, height: 250 }) }, qrCodeSuccessCallback)
            .catch(err => {
                scannerElement.innerHTML = `<p class="text-red-500 p-4">Camera Error: ${err}</p>`;
                showNotification("Camera Error: " + err, "error");
            });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().catch(err => console.warn(err));
            }
            qrScannerModal.classList.add('hidden');
            currentSubjectId = null;
        });
    }

    async function markAttendance(subjectId, qrCodeData) {
        const response = await fetch('/dashboard/student/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subjectId, qrCodeData })
        });
        const result = await response.json();
        showNotification(result.message, result.success ? 'success' : 'error');
        if (result.success) {
            setTimeout(() => location.reload(), 500);
        }
    }

    const accordion = document.getElementById('attendance-accordion');
    if (accordion) {
        accordion.addEventListener('click', (e) => {
            const button = e.target.closest('.date-toggle-btn');
            if (!button) return;

            const targetId = button.dataset.target;
            const targetContent = document.getElementById(targetId);
            const icon = button.querySelector('.accordion-icon');

            if (targetContent) {
                const isOpen = targetContent.classList.contains('open');
                document.querySelectorAll('.accordion-content.open').forEach(openContent => {
                    if (openContent.id !== targetId) {
                        openContent.classList.remove('open');
                        const openButton = document.querySelector(`[data-target="${openContent.id}"]`);
                        if (openButton) openButton.querySelector('.accordion-icon').classList.remove('rotate-180');
                    }
                });

                if (isOpen) {
                    targetContent.classList.remove('open');
                    if (icon) icon.classList.remove('rotate-180');
                } else {
                    targetContent.classList.add('open');
                    if (icon) icon.classList.add('rotate-180');
                }
            }
        });
    }
});