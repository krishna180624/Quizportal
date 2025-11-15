// Authentication JavaScript

class AuthManager {
    constructor() {
        this.initEventListeners();
        this.checkExistingSession();
    }

    initEventListeners() {
        // Tab switching
        document.getElementById('login-tab').addEventListener('click', () => this.switchTab('login'));
        document.getElementById('register-tab').addEventListener('click', () => this.switchTab('register'));

        // Form submissions
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));

        // Input validation
        document.getElementById('register-password').addEventListener('input', (e) => this.validatePasswordStrength(e.target));
        document.getElementById('register-confirm-password').addEventListener('input', (e) => this.validatePasswordMatch(e.target));
        document.getElementById('register-email').addEventListener('blur', (e) => this.validateEmail(e.target));
        document.getElementById('register-username').addEventListener('blur', (e) => this.checkUsernameAvailability(e.target));

        // Modal
        document.getElementById('alert-ok').addEventListener('click', () => this.closeModal());
        document.getElementById('alert-modal').addEventListener('click', (e) => {
            if (e.target.id === 'alert-modal') {
                this.closeModal();
            }
        });
    }

    switchTab(tab) {
        const loginTab = document.getElementById('login-tab');
        const registerTab = document.getElementById('register-tab');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        if (tab === 'login') {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        } else {
            loginTab.classList.remove('active');
            registerTab.classList.add('active');
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        }
    }

    async handleLogin(e) {
        e.preventDefault();

        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const remember = document.getElementById('remember-me').checked;

        // Clear previous errors
        this.clearErrors('login');

        // Validation
        if (!this.validateLoginForm(username, password)) {
            return;
        }

        // Show loading
        this.setLoading('login', true);

        try {
            const response = await fetch('api/login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    remember: remember
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('Success', 'Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    // Redirect based on role
                    if (result.role === 'admin') {
                        window.location.href = 'admin-dashboard.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                }, 1500);
            } else {
                this.showAlert('Login Failed', result.message, 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAlert('Error', 'Network error. Please try again.', 'error');
        } finally {
            this.setLoading('login', false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();

        const fullname = document.getElementById('register-fullname').value.trim();
        const username = document.getElementById('register-username').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        const role = document.getElementById('register-role').value;

        // Clear previous errors
        this.clearErrors('register');

        // Validation
        if (!await this.validateRegisterForm(fullname, username, email, password, confirmPassword, role)) {
            return;
        }

        // Show loading
        this.setLoading('register', true);

        try {
            const response = await fetch('api/register.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    email: email,
                    password: password,
                    full_name: fullname,
                    role: role
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('Success', 'Registration successful! Please login.', 'success');
                // Clear form
                document.getElementById('registerForm').reset();
                // Switch to login tab
                setTimeout(() => this.switchTab('login'), 2000);
            } else {
                this.showAlert('Registration Failed', result.message, 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showAlert('Error', 'Network error. Please try again.', 'error');
        } finally {
            this.setLoading('register', false);
        }
    }

    validateLoginForm(username, password) {
        let isValid = true;

        if (!username) {
            this.showError('login-username', 'Username or email is required');
            isValid = false;
        }

        if (!password) {
            this.showError('login-password', 'Password is required');
            isValid = false;
        } else if (password.length < 8) {
            this.showError('login-password', 'Password must be at least 8 characters');
            isValid = false;
        }

        return isValid;
    }

    async validateRegisterForm(fullname, username, email, password, confirmPassword, role) {
        let isValid = true;

        // Full name validation
        if (!fullname || fullname.length < 2) {
            this.showError('register-fullname', 'Full name must be at least 2 characters');
            isValid = false;
        }

        // Username validation
        if (!username || username.length < 3) {
            this.showError('register-username', 'Username must be at least 3 characters');
            isValid = false;
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            this.showError('register-username', 'Username can only contain letters, numbers, and underscores');
            isValid = false;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            this.showError('register-email', 'Please enter a valid email address');
            isValid = false;
        }

        // Password validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!password || !passwordRegex.test(password)) {
            this.showError('register-password', 'Password must be at least 8 characters with uppercase, lowercase, and numbers');
            isValid = false;
        }

        // Password confirmation
        if (password !== confirmPassword) {
            this.showError('register-confirm-password', 'Passwords do not match');
            isValid = false;
        }

        // Role validation
        if (!role) {
            this.showError('register-role', 'Please select a role');
            isValid = false;
        }

        return isValid;
    }

    validateEmail(input) {
        const email = input.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email) {
            this.showError('register-email', 'Email is required');
            return false;
        }

        if (!emailRegex.test(email)) {
            this.showError('register-email', 'Please enter a valid email address');
            return false;
        }

        this.clearError('register-email');
        return true;
    }

    validatePasswordStrength(input) {
        const password = input.value;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

        if (!password) {
            this.showError('register-password', 'Password is required');
            return false;
        }

        if (!passwordRegex.test(password)) {
            this.showError('register-password', 'Password must be at least 8 characters with uppercase, lowercase, and numbers');
            return false;
        }

        this.clearError('register-password');
        return true;
    }

    validatePasswordMatch(input) {
        const password = document.getElementById('register-password').value;
        const confirmPassword = input.value;

        if (!confirmPassword) {
            this.showError('register-confirm-password', 'Please confirm your password');
            return false;
        }

        if (password !== confirmPassword) {
            this.showError('register-confirm-password', 'Passwords do not match');
            return false;
        }

        this.clearError('register-confirm-password');
        return true;
    }

    async checkUsernameAvailability(input) {
        const username = input.value.trim();

        if (!username || username.length < 3) {
            return false;
        }

        try {
            const response = await fetch('api/check-username.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: username })
            });

            const result = await response.json();

            if (!result.available) {
                this.showError('register-username', 'Username is already taken');
                return false;
            }

            this.clearError('register-username');
            return true;
        } catch (error) {
            console.error('Username check error:', error);
            return true; // Allow registration on network error
        }
    }

    showError(elementId, message) {
        const element = document.getElementById(elementId);
        const errorElement = document.getElementById(elementId + '-error');

        if (element) {
            element.classList.add('error');
        }

        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }

    clearError(elementId) {
        const element = document.getElementById(elementId);
        const errorElement = document.getElementById(elementId + '-error');

        if (element) {
            element.classList.remove('error');
        }

        if (errorElement) {
            errorElement.classList.remove('show');
        }
    }

    clearErrors(form) {
        const prefix = form === 'login' ? 'login' : 'register';
        const elements = document.querySelectorAll(`[id^="${prefix}-"]`);

        elements.forEach(element => {
            element.classList.remove('error');
        });

        const errors = document.querySelectorAll(`[id^="${prefix}-"][id$="-error"]`);
        errors.forEach(error => {
            error.classList.remove('show');
            error.textContent = '';
        });
    }

    setLoading(form, loading) {
        const btn = document.getElementById(`${form}-btn`);
        const btnText = document.getElementById(`${form}-btn-text`);
        const loadingSpinner = document.getElementById(`${form}-loading`);

        if (loading) {
            btn.disabled = true;
            btnText.style.display = 'none';
            loadingSpinner.style.display = 'inline-block';
        } else {
            btn.disabled = false;
            btnText.style.display = 'inline';
            loadingSpinner.style.display = 'none';
        }
    }

    showAlert(title, message, type) {
        const modal = document.getElementById('alert-modal');
        const alertTitle = document.getElementById('alert-title');
        const alertMessage = document.getElementById('alert-message');

        alertTitle.textContent = title;
        alertMessage.textContent = message;

        // Add appropriate styling based on type
        if (type === 'success') {
            modal.style.borderColor = '#28a745';
        } else if (type === 'error') {
            modal.style.borderColor = '#dc3545';
        }

        modal.classList.add('show');
    }

    closeModal() {
        const modal = document.getElementById('alert-modal');
        modal.classList.remove('show');
    }

    async checkExistingSession() {
        try {
            const response = await fetch('api/check-session.php');
            const result = await response.json();

            if (result.logged_in) {
                // User is already logged in, redirect to appropriate dashboard
                if (result.role === 'admin') {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            }
        } catch (error) {
            console.error('Session check error:', error);
            // Continue with login/registration flow
        }
    }
}

// Initialize authentication manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});