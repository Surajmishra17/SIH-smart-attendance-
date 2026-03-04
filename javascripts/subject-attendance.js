// javascripts/subject-attendance.js
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

    // --- Accordion Logic ---
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

    // --- Face Attendance Logic ---
    const panel = document.getElementById('face-attendance-panel');
    if (!panel) return;

    const subjectId = panel.dataset.subjectId;
    const video = document.getElementById('face-attendance-video');
    const overlayCanvas = document.getElementById('face-attendance-overlay');
    const statusEl = document.getElementById('face-attendance-status');
    const livenessEl = document.getElementById('face-attendance-liveness');
    const startBtn = document.getElementById('start-face-attendance-btn');
    const stopBtn = document.getElementById('stop-face-attendance-btn');
    const logEl = document.getElementById('face-attendance-log');

    let stream = null;
    let detectionInterval = null;
    let faceMatcher = null;
    let studentMap = new Map();
    let modelsLoaded = false;
    let blinkState = { sawClosed: false, verified: false };
    const markedThisSession = new Set();
    const pendingMarks = new Set();
    const MATCH_THRESHOLD = 0.6;
    let detectionBusy = false;

    function logMessage(message) {
        if (!logEl) return;
        const item = document.createElement('li');
        item.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
        logEl.prepend(item);
        while (logEl.children.length > 12) {
            logEl.removeChild(logEl.lastChild);
        }
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

    async function loadModels() {
        if (modelsLoaded) return;
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
                modelsLoaded = true;
                return;
            } catch (error) {
                errors.push(`${source}: ${error.message || 'load failed'}`);
            }
        }

        throw new Error(`Face model loading failed. ${errors.join(' | ')}`);
    }

    async function loadStudents() {
        const response = await fetch(`/dashboard/api/subject/${subjectId}/face-students`);
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Failed to load registered students.');
        }

        const labeled = [];
        studentMap = new Map();
        for (const student of result.students) {
            const descriptor = new Float32Array(student.descriptor);
            labeled.push(new faceapi.LabeledFaceDescriptors(student.label, [descriptor]));
            studentMap.set(student.label, student);
        }

        if (labeled.length === 0) {
            throw new Error('No students with registered faces were found for this subject.');
        }

        faceMatcher = new faceapi.FaceMatcher(labeled, MATCH_THRESHOLD);
        statusEl.textContent = `Loaded ${labeled.length} registered face profiles.`;
        if (result.skipped) {
            logMessage(`Skipped ${result.skipped} invalid face profile(s). Ask students to re-register.`);
        }
    }

    function stopCamera() {
        if (detectionInterval) {
            clearInterval(detectionInterval);
            detectionInterval = null;
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        if (video) video.srcObject = null;
    }

    async function startCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('This device/browser does not support webcam access.');
        }

        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 540 } },
            audio: false
        });
        video.srcObject = stream;
        await new Promise(resolve => {
            video.onloadedmetadata = () => resolve();
        });
    }

    function distance(p1, p2) {
        return Math.hypot(p1.x - p2.x, p1.y - p2.y);
    }

    function eyeAspectRatio(eyePoints) {
        // EAR = (|p2-p6| + |p3-p5|) / (2*|p1-p4|)
        const vertical = distance(eyePoints[1], eyePoints[5]) + distance(eyePoints[2], eyePoints[4]);
        const horizontal = distance(eyePoints[0], eyePoints[3]);
        return horizontal === 0 ? 0 : vertical / (2 * horizontal);
    }

    function updateBlinkGate(landmarks) {
        if (!landmarks) return;
        const leftEAR = eyeAspectRatio(landmarks.getLeftEye());
        const rightEAR = eyeAspectRatio(landmarks.getRightEye());
        const avgEAR = (leftEAR + rightEAR) / 2;

        if (avgEAR < 0.2) blinkState.sawClosed = true;
        if (blinkState.sawClosed && avgEAR > 0.26) {
            blinkState.verified = true;
            livenessEl.textContent = 'Liveness check passed (blink detected).';
            livenessEl.className = 'text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2';
        }
    }

    async function markFaceAttendance(studentId, studentName, distanceScore) {
        if (pendingMarks.has(studentId) || markedThisSession.has(studentId)) return;
        pendingMarks.add(studentId);

        try {
            const response = await fetch('/dashboard/api/mark-face-attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subjectId,
                    studentId,
                    confidence: Number((1 - distanceScore).toFixed(4)),
                    threshold: MATCH_THRESHOLD,
                    livenessVerified: blinkState.verified
                })
            });
            const result = await response.json();

            if (!result.success) {
                logMessage(`Failed to mark ${studentName}: ${result.message || 'Server error'}`);
                return;
            }

            markedThisSession.add(studentId);
            logMessage(result.alreadyMarked ? `Updated ${studentName} (already marked today).` : `Marked present: ${studentName}.`);
        } catch (error) {
            logMessage(`Failed to mark ${studentName}: ${error.message}`);
        } finally {
            pendingMarks.delete(studentId);
        }
    }

    async function detectLoop() {
        if (!video || !faceMatcher) return;
        if (video.readyState < 2) return;
        if (detectionBusy) return;
        detectionBusy = true;

        try {
            const displaySize = { width: video.clientWidth, height: video.clientHeight };
            faceapi.matchDimensions(overlayCanvas, displaySize);

            const detections = await faceapi
                .detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptors();

            const resized = faceapi.resizeResults(detections, displaySize);
            const context = overlayCanvas.getContext('2d');
            context.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

            if (!resized.length) {
                statusEl.textContent = 'Scanning... no face detected.';
                return;
            }

            statusEl.textContent = `Scanning... detected ${resized.length} face(s).`;

            for (const detection of resized) {
                updateBlinkGate(detection.landmarks);

                const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
                const box = detection.detection.box;
                let label = 'Unknown';
                let color = '#ef4444';

                if (bestMatch.label !== 'unknown' && bestMatch.distance <= MATCH_THRESHOLD) {
                    const student = studentMap.get(bestMatch.label);
                    label = student ? `${student.name} (${bestMatch.distance.toFixed(2)})` : `${bestMatch.label} (${bestMatch.distance.toFixed(2)})`;
                    color = '#22c55e';

                    const studentName = student ? student.name : bestMatch.label;
                    markFaceAttendance(bestMatch.label, studentName, bestMatch.distance);
                }

                new faceapi.draw.DrawBox(box, { label, boxColor: color }).draw(overlayCanvas);
            }
        } finally {
            detectionBusy = false;
        }
    }

    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            try {
                startBtn.disabled = true;
                statusEl.textContent = 'Loading face models...';
                await loadModels();

                statusEl.textContent = 'Loading student face profiles...';
                await loadStudents();

                statusEl.textContent = 'Starting camera...';
                await startCamera();

                blinkState = { sawClosed: false, verified: false };
                livenessEl.textContent = 'Liveness check (optional): blink once in view for anti-spoof signal.';
                livenessEl.className = 'text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2';

                if (detectionInterval) clearInterval(detectionInterval);
                detectionInterval = setInterval(() => {
                    detectLoop().catch(err => {
                        statusEl.textContent = `Detection error: ${err.message}`;
                    });
                }, 700);

                statusEl.textContent = 'Face attendance is running.';
                logMessage('Face attendance started.');
            } catch (error) {
                statusEl.textContent = `Unable to start: ${error.message}`;
                logMessage(`Start failed: ${error.message}`);
                stopCamera();
            } finally {
                startBtn.disabled = false;
            }
        });
    }

    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            stopCamera();
            statusEl.textContent = 'Camera stopped.';
            logMessage('Face attendance stopped.');
        });
    }

    window.addEventListener('beforeunload', () => {
        stopCamera();
    });
});
