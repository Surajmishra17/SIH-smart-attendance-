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
    const scannerElement = document.getElementById('qr-scanner');
    let html5QrCode;
    let currentSubjectId = null;

    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    let classIdToDelete = null;

    // Face registration elements
    const faceVideo = document.getElementById('face-register-video');
    const faceStatus = document.getElementById('face-register-status');
    const startFaceCameraBtn = document.getElementById('start-face-register-camera');
    const registerFaceBtn = document.getElementById('register-face-btn');
    const deleteFaceBtn = document.getElementById('delete-face-btn');
    let faceStream = null;
    let faceModelsLoaded = false;

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

    async function canLoadModelsFrom(baseUrl) {
        const manifestUrl = `${baseUrl}/ssd_mobilenetv1_model-weights_manifest.json`;
        try {
            const response = await fetch(manifestUrl, { method: 'GET', cache: 'no-store' });
            return response.ok;
        } catch (_) {
            return false;
        }
    }

    async function loadFaceModels() {
        if (faceModelsLoaded) return;
        if (!window.faceapi) throw new Error('face-api.js not loaded.');

        const modelSources = [
            '/models/face-api',
            'https://justadudewhohacks.github.io/face-api.js/models'
        ];

        const errors = [];
        for (const source of modelSources) {
            const reachable = await canLoadModelsFrom(source);
            if (!reachable) {
                errors.push(`${source}: manifest not found`);
                continue;
            }

            try {
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(source),
                    faceapi.nets.faceLandmark68Net.loadFromUri(source),
                    faceapi.nets.faceRecognitionNet.loadFromUri(source)
                ]);
                faceModelsLoaded = true;
                return;
            } catch (error) {
                errors.push(`${source}: ${error.message || 'load failed'}`);
            }
        }

        throw new Error(`Face model loading failed. ${errors.join(' | ')}`);
    }

    async function startFaceCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('This device/browser does not support webcam access.');
        }

        if (faceStream) return;

        faceStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false
        });
        faceVideo.srcObject = faceStream;
    }

    function stopFaceCamera() {
        if (!faceStream) return;
        faceStream.getTracks().forEach(track => track.stop());
        faceStream = null;
        if (faceVideo) faceVideo.srcObject = null;
    }

    if (startFaceCameraBtn) {
        startFaceCameraBtn.addEventListener('click', async () => {
            try {
                faceStatus.textContent = 'Loading face models...';
                await loadFaceModels();
                faceStatus.textContent = 'Requesting camera permission...';
                await startFaceCamera();
                faceStatus.textContent = 'Camera ready. Keep your face centered and click "Register Face".';
            } catch (error) {
                faceStatus.textContent = 'Unable to start camera.';
                showNotification(error.message || 'Failed to start face registration camera.', 'error');
            }
        });
    }

    if (registerFaceBtn) {
        registerFaceBtn.addEventListener('click', async () => {
            try {
                registerFaceBtn.disabled = true;
                registerFaceBtn.textContent = 'Registering...';

                if (!faceModelsLoaded) {
                    faceStatus.textContent = 'Loading face models...';
                    await loadFaceModels();
                }
                if (!faceStream) {
                    faceStatus.textContent = 'Starting camera...';
                    await startFaceCamera();
                }

                faceStatus.textContent = 'Detecting face...';
                const detection = await faceapi
                    .detectSingleFace(faceVideo, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (!detection) {
                    showNotification('No face detected. Improve lighting and try again.', 'error');
                    faceStatus.textContent = 'No face detected. Keep your face in frame and retry.';
                    return;
                }

                const descriptor = Array.from(detection.descriptor);
                const response = await fetch('/dashboard/api/register-face', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ descriptor })
                });
                const result = await response.json();
                showNotification(result.message, result.success ? 'success' : 'error');

                if (result.success) {
                    faceStatus.textContent = 'Face registration complete.';
                    setTimeout(() => location.reload(), 500);
                } else {
                    faceStatus.textContent = 'Face registration failed. Try again.';
                }
            } catch (error) {
                faceStatus.textContent = 'Face registration failed.';
                showNotification(error.message || 'Face registration failed.', 'error');
            } finally {
                registerFaceBtn.disabled = false;
                registerFaceBtn.textContent = 'Register Face';
            }
        });
    }

    if (deleteFaceBtn) {
        deleteFaceBtn.addEventListener('click', async () => {
            const ok = window.confirm('Delete your registered face? You will need to register again for face attendance.');
            if (!ok) return;

            try {
                deleteFaceBtn.disabled = true;
                deleteFaceBtn.textContent = 'Deleting...';
                faceStatus.textContent = 'Deleting registered face...';

                const response = await fetch('/dashboard/api/register-face', { method: 'DELETE' });
                const result = await response.json();
                showNotification(result.message, result.success ? 'success' : 'error');

                if (result.success) {
                    stopFaceCamera();
                    setTimeout(() => location.reload(), 500);
                } else {
                    faceStatus.textContent = 'Unable to delete registered face.';
                }
            } catch (error) {
                faceStatus.textContent = 'Unable to delete registered face.';
                showNotification(error.message || 'Failed to delete face data.', 'error');
            } finally {
                deleteFaceBtn.disabled = false;
                deleteFaceBtn.textContent = 'Delete Registered Face';
            }
        });
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
        scannerElement.innerHTML = '';
        html5QrCode = new Html5Qrcode('qr-scanner');

        const qrCodeSuccessCallback = (decodedText) => {
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().then(() => {
                    qrScannerModal.classList.add('hidden');
                    markAttendance(currentSubjectId, decodedText);
                }).catch(err => console.error(err));
            }
        };

        html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: (w, h) => ({ width: 250, height: 250 }) },
            qrCodeSuccessCallback
        ).catch(err => {
            scannerElement.innerHTML = `<p class="text-red-500 p-4">Camera Error: ${err}</p>`;
            showNotification(`Camera Error: ${err}`, 'error');
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

    window.addEventListener('beforeunload', () => {
        stopFaceCamera();
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().catch(() => { });
        }
    });
});
