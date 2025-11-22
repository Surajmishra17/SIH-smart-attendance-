document.addEventListener('DOMContentLoaded', function () {
    const loginWrapper = document.getElementById('login-form-wrapper');
    const signupWrapper = document.getElementById('signup-form-wrapper');
    const showSignupLink = document.getElementById('show-signup');
    const showLoginLink = document.getElementById('show-login');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    // [NEW] Error Elements
    const loginErrorBox = document.getElementById('login-error-message');
    const loginErrorText = document.getElementById('login-error-text');

    function getDeviceId() {
        let deviceId = localStorage.getItem('attensys_device_id');
        if (!deviceId) {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                deviceId = crypto.randomUUID();
            } else {
                deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            }
            localStorage.setItem('attensys_device_id', deviceId);
        }
        return deviceId;
    }

    const toggleForms = () => {
        loginWrapper.classList.toggle('form-hidden');
        loginWrapper.classList.toggle('form-active');
        signupWrapper.classList.toggle('form-hidden');
        signupWrapper.classList.toggle('form-active');

        // Hide error message when switching forms
        if (loginErrorBox) loginErrorBox.classList.add('hidden');
    };

    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        toggleForms();
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        toggleForms();
    });

    const roleSelectors = document.querySelectorAll('.role-selector');
    roleSelectors.forEach(selector => {
        selector.addEventListener('click', function (e) {
            if (e.target.tagName === 'BUTTON') {
                const currentRole = e.target.dataset.role;
                syncRoleSelectors(currentRole);
            }
        });
    });

    function syncRoleSelectors(activeRole) {
        roleSelectors.forEach(selector => {
            selector.querySelectorAll('button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.role === activeRole);
            });
        });
    }

    // LOGIN FORM SUBMISSION
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Reset error message state
        loginErrorBox.classList.add('hidden');
        loginErrorText.textContent = '';

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const role = loginForm.querySelector('.role-selector .active').dataset.role;
        const deviceId = getDeviceId();

        try {
            const response = await fetch('/login-signup/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role, deviceId })
            });

            const result = await response.json();

            if (result.success && result.redirectUrl) {
                window.location.href = result.redirectUrl;
            } else {
                // [NEW] Show On-Screen Error instead of Alert
                loginErrorText.textContent = result.message;
                loginErrorBox.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Login error:', error);
            loginErrorText.textContent = "An unexpected error occurred. Please try again.";
            loginErrorBox.classList.remove('hidden');
        }
    });

    // SIGNUP FORM SUBMISSION
    signupForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const role = signupForm.querySelector('.role-selector .active').dataset.role;
        const deviceId = getDeviceId();

        try {
            const response = await fetch('/login-signup/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, role, deviceId })
            });

            const result = await response.json();
            alert(result.message); // Keeping alert for Signup success/fail as requested
            if (result.success) {
                toggleForms();
            }
        } catch (error) {
            console.error('Signup error:', error);
            alert("An error occurred during signup.");
        }
    });
});