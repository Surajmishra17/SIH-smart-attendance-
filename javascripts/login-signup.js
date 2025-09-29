document.addEventListener('DOMContentLoaded', function () {
    const loginWrapper = document.getElementById('login-form-wrapper');
    const signupWrapper = document.getElementById('signup-form-wrapper');
    const showSignupLink = document.getElementById('show-signup');
    const showLoginLink = document.getElementById('show-login');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    // Function to switch between login and signup forms
    const toggleForms = () => {
        loginWrapper.classList.toggle('form-hidden');
        loginWrapper.classList.toggle('form-active');
        signupWrapper.classList.toggle('form-hidden');
        signupWrapper.classList.toggle('form-active');
    };

    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        toggleForms();
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        toggleForms();
    });

    // Handle Role Selection and sync between forms
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

    // FIX: Replaced the demo alert with actual form submission logic using fetch.
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const role = loginForm.querySelector('.role-selector .active').dataset.role;

        const response = await fetch('/login-signup/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                role
            })
        });

        const result = await response.json();
        // alert(result.message); // This will still show the "Welcome..." message

        if (result.success && result.redirectUrl) {
            // If login was successful and a redirect URL is provided, navigate to it
            window.location.href = result.redirectUrl;
        }
    });

    signupForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const role = signupForm.querySelector('.role-selector .active').dataset.role;

        const response = await fetch('/login-signup/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role })
        });

        const result = await response.json();
        alert(result.message); // Show the success message from the server
        if (result.success) {
            // Redirect or switch to login form on successful signup
            console.log('Signup successful!');
            toggleForms(); // Switch to login view after signup
        }
    });
});
