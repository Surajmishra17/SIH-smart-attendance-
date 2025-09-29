document.addEventListener('DOMContentLoaded', function () {
            const loginWrapper = document.getElementById('login-form-wrapper');
            const signupWrapper = document.getElementById('signup-form-wrapper');
            const showSignupLink = document.getElementById('show-signup');
            const showLoginLink = document.getElementById('show-login');

            // Function to switch forms
            const toggleForms = () => {
                loginWrapper.classList.toggle('form-hidden');
                loginWrapper.classList.toggle('form-active');
                signupWrapper.classList.toggle('form-hidden');
                signupWrapper.classList.toggle('form-active');
            };

            // Event listeners for switching forms
            showSignupLink.addEventListener('click', (e) => {
                e.preventDefault();
                toggleForms();
            });

            showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                toggleForms();
            });

            // Handle Role Selection
            const roleSelectors = document.querySelectorAll('.role-selector');

            roleSelectors.forEach(selector => {
                selector.addEventListener('click', function (e) {
                    if (e.target.tagName === 'BUTTON') {
                        // Remove active class from sibling buttons
                        const buttons = this.querySelectorAll('button');
                        buttons.forEach(btn => btn.classList.remove('active'));

                        // Add active class to clicked button
                        e.target.classList.add('active');

                        // Sync the other form's role selector
                        const currentRole = e.target.dataset.role;
                        syncRoleSelectors(currentRole);
                    }
                });
            });

            function syncRoleSelectors(activeRole) {
                roleSelectors.forEach(selector => {
                    const buttons = selector.querySelectorAll('button');
                    buttons.forEach(btn => {
                        btn.classList.toggle('active', btn.dataset.role === activeRole);
                    });
                });
            }

            // Prevent actual form submission for this demo
            document.querySelectorAll('form').forEach(form => {
                form.addEventListener('submit', function (e) {
                    e.preventDefault();
                    // You would handle form submission logic here (e.g., API calls)
                    alert('Form submitted! (Demo)');
                });
            });
        });