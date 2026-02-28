document.addEventListener('DOMContentLoaded', () => {
    // Password visibility toggle
    const togglePasswords = document.querySelectorAll('.toggle-password');

    togglePasswords.forEach(toggle => {
        toggle.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            const passwordField = document.getElementById(targetId);

            if (passwordField.type === 'password') {
                passwordField.type = 'text';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            } else {
                passwordField.type = 'password';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            }
        });
    });

    // Form Validation Logic
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            let isValid = true;

            const fullname = document.getElementById('fullname');
            const email = document.getElementById('email');
            const password = document.getElementById('password');
            const confirmPassword = document.getElementById('confirm-password');

            // Name validation
            if (fullname.value.trim() === '') {
                showError(fullname);
                isValid = false;
            } else {
                hideError(fullname);
            }

            // Email validation
            if (!validateEmail(email.value)) {
                showError(email);
                isValid = false;
            } else {
                hideError(email);
            }

            // Password size validation
            if (password.value.length < 8) {
                showError(password);
                isValid = false;
            } else {
                hideError(password);
            }

            // Confirm password validation
            if (confirmPassword.value !== password.value || confirmPassword.value === '') {
                showError(confirmPassword);
                isValid = false;
            } else {
                hideError(confirmPassword);
            }

            if (isValid) {
                const userData = {
                    fullname: fullname.value,
                    email: email.value,
                    password: password.value
                };

                fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.error) {
                            alert(data.error);
                        } else {
                            // Assuming the backend has set a cookie and validated
                            alert('Account Created Successfully! Welcome to KodNest Banking.');
                            // Store full name in session storage
                            sessionStorage.setItem('userName', data.fullname);
                            window.location.href = 'dashboard.html';
                        }
                    })
                    .catch(err => alert('An error occurred during registration.'));
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            let isValid = true;

            const email = document.getElementById('email');
            const password = document.getElementById('password');

            if (!validateEmail(email.value)) {
                showError(email);
                isValid = false;
            } else {
                hideError(email);
            }

            if (password.value === '') {
                showError(password);
                isValid = false;
            } else {
                hideError(password);
            }

            if (isValid) {
                const loginData = {
                    email: email.value,
                    password: password.value
                };

                fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(loginData)
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.error) {
                            showError(email);
                            showError(password);
                            alert(data.error);
                        } else {
                            alert('Login Successful! Tokens Validated. Redirecting to dashboard...');
                            sessionStorage.setItem('userName', data.fullname);
                            window.location.href = 'dashboard.html';
                        }
                    })
                    .catch(err => alert('An error occurred during login.'));
            }
        });
    }

    // Checking auth logic on dashboard load
    if (window.location.pathname.includes('dashboard.html')) {
        fetch('/api/verify')
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    alert('Unauthorized. Please login first.');
                    window.location.href = 'login.html';
                } else {
                    console.log(data.message); // Valid Token
                }
            });

        const storedName = sessionStorage.getItem('userName');
        if (storedName) {
            const highlightName = document.querySelector('.highlight');
            if (highlightName) highlightName.textContent = storedName.split(' ')[0]; // first name
        }
    }

    // Dashboard Transfer Logic
    const transferForm = document.getElementById('transfer-form');
    if (transferForm) {
        transferForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const recipient = document.getElementById('recipient').value;
            const amount = document.getElementById('amount').value;

            if (recipient && amount > 0) {
                alert(`Successfully sent ₹${amount} to ${recipient}`);
                transferForm.reset();
            }
        });
    }

    // Dashboard Navigation Logic
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.dashboard-view');

    if (navItems.length > 0 && views.length > 0) {
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();

                // Remove active class from all links
                navItems.forEach(nav => nav.classList.remove('active'));

                // Add active class to clicked link
                item.classList.add('active');

                // Hide all views
                views.forEach(view => view.classList.remove('active'));

                // Show targeted view
                const targetId = item.getAttribute('data-target');
                const targetView = document.getElementById(targetId);
                if (targetView) targetView.classList.add('active');
            });
        });
    }

    // Helper functions
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

    function showError(input) {
        const formGroup = input.parentElement;
        const errorMsg = formGroup.querySelector('.error-msg');
        input.style.border = '1px solid #ff4d4d';
        if (errorMsg) errorMsg.style.display = 'block';
    }

    function hideError(input) {
        const formGroup = input.parentElement;
        const errorMsg = formGroup.querySelector('.error-msg');
        input.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        if (errorMsg) errorMsg.style.display = 'none';
    }

    // Reset errors on input
    const allInputs = document.querySelectorAll('.input-field');
    allInputs.forEach(input => {
        input.addEventListener('input', () => {
            hideError(input);
        });
    });
});

window.logout = function () {
    fetch('/api/logout', { method: 'POST' })
        .then(() => {
            sessionStorage.removeItem('userName');
            window.location.href = 'login.html';
        });
};
