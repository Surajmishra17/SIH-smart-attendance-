// javascripts/student-dashboard.js
document.addEventListener('DOMContentLoaded', () => {
    const joinClassForm = document.getElementById('join-class-form');
    const classList = document.getElementById('class-list');
    const qrScannerModal = document.getElementById('qr-scanner-modal');
    const closeModal = document.getElementById('close-modal');
    const scannerElement = document.getElementById("qr-scanner"); // Get the scanner DIV
    let html5QrCode;
    let currentSubjectId = null;

    // Elements for notifications and modals
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    let classIdToDelete = null;

    // Helper function to show on-page notifications
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
        }, 5000); // Increased time to 5 seconds to read errors
    }

    // Event listener for JOINING a class
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

    // Event listener for clicks on the class list
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

    // Handle clicks on the final "Yes, Leave" button
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            if (classIdToDelete) {
                leaveClass(classIdToDelete);
            }
            deleteConfirmModal.classList.add('hidden');
        });
    }

    // Handle clicks on the "Cancel" button
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
            classIdToDelete = null;
            deleteConfirmModal.classList.add('hidden');
        });
    }

    // Function to LEAVE a class
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

    // ** MODIFIED function to open scanner with ERROR HANDLING **
    function openQrScanner() {
        if (!currentSubjectId) {
            console.error("Scan QR button clicked, but no subject ID was found.");
            return;
        }

        qrScannerModal.classList.remove('hidden');
        scannerElement.innerHTML = ""; // Clear any old content

        // Re-create the instance to be safe
        html5QrCode = new Html5Qrcode("qr-scanner");

        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().then(ignore => {
                    qrScannerModal.classList.add('hidden');
                    markAttendance(currentSubjectId, decodedText);
                }).catch(err => {
                    console.error("Failed to stop QR scanner after success.", err);
                });
            }
        };

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        // ** ADDED .catch() FOR DEBUGGING **
        html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
            .catch(err => {
                // This will now show us the exact error
                console.error("Camera failed to start:", err);
                const errorMessage = err.message || err;
                showNotification("Error: Could not start camera. " + errorMessage, "error");
                scannerElement.innerHTML = `<p class="text-red-500 p-4"><b>Could not start camera.</b><br/>Error: ${errorMessage}</p>`;
            });
    }

    // ** MODIFIED function to close modal **
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            if (html5QrCode && html5QrCode.isScanning) {
                // Use a catch block here too
                html5QrCode.stop().catch(err => {
                    // This is not critical, but good to log
                    console.warn("QR scanner stop() failed on close, but this is usually safe.", err);
                });
            }
            qrScannerModal.classList.add('hidden');
            currentSubjectId = null;
        });
    }

    // Function to mark attendance for a SUBJECT
    async function markAttendance(subjectId, qrCodeData) {
        const response = await fetch('/dashboard/student/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subjectId, qrCodeData })
        });
        const result = await response.json();
        showNotification(result.message, result.success ? 'success' : 'error');
        if (result.success) {
            setTimeout(() => location.reload(), 500); // Reload to show new attendance record
        }
    }

    // *** NEW: Accordion logic for Attendance History ***
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

                // Close all others
                document.querySelectorAll('.accordion-content.open').forEach(openContent => {
                    if (openContent.id !== targetId) {
                        openContent.classList.remove('open');
                        const openButton = document.querySelector(`[data-target="${openContent.id}"]`);
                        if (openButton) {
                            openButton.querySelector('.accordion-icon').classList.remove('rotate-180');
                        }
                    }
                });

                // Toggle the clicked one
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