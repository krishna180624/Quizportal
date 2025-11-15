// Profile Management JavaScript

class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.currentTab = 'edit-profile';

        this.init();
    }

    async init() {
        this.initEventListeners();
        await this.checkAuth();
        await this.loadProfileData();
        this.hideLoading();
    }

    initEventListeners() {
        // Modal event listeners
        document.getElementById('alert-ok').addEventListener('click', () => this.closeModal('alert-modal'));

        document.getElementById('alert-modal').addEventListener('click', (e) => {
            if (e.target.id === 'alert-modal') this.closeModal('alert-modal');
        });

        // Form submissions
        document.getElementById('profile-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProfile();
        });

        document.getElementById('password-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePassword();
        });

        // Password strength checker
        document.getElementById('new-password').addEventListener('input', (e) => {
            this.checkPasswordStrength(e.target.value);
        });

        // Password confirmation
        document.getElementById('confirm-new-password').addEventListener('input', (e) => {
            this.validatePasswordMatch();
        });

        // Profile image upload
        document.getElementById('profile-image-upload').addEventListener('change', (e) => {
            this.previewProfileImage(e.target.files[0]);
        });
    }

    async checkAuth() {
        try {
            const response = await fetch('api/check-session.php');
            const result = await response.json();

            if (!result.logged_in) {
                this.showAlert('Access Denied', 'Please login to access your profile.');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
                return false;
            }

            this.currentUser = result.user;
            return true;
        } catch (error) {
            console.error('Auth check error:', error);
            return false;
        }
    }

    async loadProfileData() {
        try {
            // Display basic user info
            document.getElementById('profile-name').textContent = this.currentUser.full_name;
            document.getElementById('profile-email').textContent = this.currentUser.email;
            document.getElementById('profile-role').textContent = this.currentUser.role.charAt(0).toUpperCase() + this.currentUser.role.slice(1);
            document.getElementById('profile-joined').textContent = 'Joined: ' + new Date(this.currentUser.created_at).toLocaleDateString();

            // Load profile stats
            const response = await fetch('api/profile-stats.php');
            const result = await response.json();

            if (result.success) {
                this.updateProfileStats(result.stats);
                this.displayExamHistory(result.history);
            }

            // Populate edit form
            document.getElementById('edit-fullname').value = this.currentUser.full_name;
            document.getElementById('edit-email').value = this.currentUser.email;
            document.getElementById('edit-username').value = this.currentUser.username;

            // Disable username field (usually not changeable)
            document.getElementById('edit-username').disabled = true;

            // Display profile image if exists
            if (this.currentUser.profile_image) {
                const profileImage = document.getElementById('profile-image');
                profileImage.innerHTML = `<img src="uploads/profiles/${this.currentUser.profile_image}" alt="Profile">`;
            }

        } catch (error) {
            console.error('Load profile data error:', error);
            this.showAlert('Error', 'Failed to load profile data');
        }
    }

    updateProfileStats(stats) {
        this.animateCounter('total-exams-stat', stats.totalExams);
        this.animateCounter('average-score-stat', stats.averageScore, '%');
        this.animateCounter('completed-exams-stat', stats.completedExams);
        this.animateCounter('best-score-stat', stats.bestScore, '%');
    }

    displayExamHistory(history) {
        const container = document.getElementById('exam-history-list');

        if (history.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No exam history available.</div>';
            return;
        }

        container.innerHTML = history.map(item => {
            const date = new Date(item.completed_at);
            const passed = item.percentage >= item.passing_percentage;
            const statusClass = passed ? 'status-active' : 'status-scheduled';
            const statusText = passed ? 'Passed' : 'Failed';

            return `
                <div class="history-item">
                    <div class="history-info">
                        <h4>${item.exam_title}</h4>
                        <p>Completed on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}</p>
                        <p>Duration: ${item.duration_minutes} minutes</p>
                    </div>
                    <div class="history-score">
                        <div class="score-display">${item.score}/${item.total_marks}</div>
                        <div class="score-status">
                            <span class="status-badge ${statusClass}">${item.percentage}% - ${statusText}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    showTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Show selected tab
        event.target.classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');

        this.currentTab = tabName;
    }

    async updateProfile() {
        const formData = new FormData();
        formData.append('full_name', document.getElementById('edit-fullname').value.trim());
        formData.append('email', document.getElementById('edit-email').value.trim());

        const imageFile = document.getElementById('profile-image-upload').files[0];
        if (imageFile) {
            if (!this.validateImageFile(imageFile)) {
                return;
            }
            formData.append('profile_image', imageFile);
        }

        try {
            const response = await fetch('api/update-profile.php', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('Success', 'Profile updated successfully');
                // Reload page to show updated data
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                this.showAlert('Error', result.message);
            }
        } catch (error) {
            console.error('Update profile error:', error);
            this.showAlert('Error', 'Network error. Please try again.');
        }
    }

    validateImageFile(file) {
        if (!file) return false;

        // Check file size (2MB max)
        if (file.size > 2097152) {
            this.showAlert('Error', 'File size must be less than 2MB');
            return false;
        }

        // Check file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            this.showAlert('Error', 'Only JPG, PNG, and GIF files are allowed');
            return false;
        }

        return true;
    }

    previewProfileImage(file) {
        if (!file) return;

        if (!this.validateImageFile(file)) {
            document.getElementById('profile-image-upload').value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('profile-image').innerHTML = `<img src="${e.target.result}" alt="Profile Preview">`;
        };
        reader.readAsDataURL(file);
    }

    async changePassword() {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-new-password').value;

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            this.showAlert('Error', 'All password fields are required');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showAlert('Error', 'New passwords do not match');
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            this.showAlert('Error', 'New password must be at least 8 characters with uppercase, lowercase, and numbers');
            return;
        }

        try {
            const response = await fetch('api/change-password.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('Success', 'Password changed successfully');
                // Clear form
                document.getElementById('password-form').reset();
                document.getElementById('password-strength').className = 'password-strength';
            } else {
                this.showAlert('Error', result.message);
            }
        } catch (error) {
            console.error('Change password error:', error);
            this.showAlert('Error', 'Network error. Please try again.');
        }
    }

    checkPasswordStrength(password) {
        const strengthBar = document.getElementById('password-strength');

        if (!password) {
            strengthBar.className = 'password-strength';
            return;
        }

        let strength = 0;

        // Check for lowercase
        if (/[a-z]/.test(password)) strength++;

        // Check for uppercase
        if (/[A-Z]/.test(password)) strength++;

        // Check for numbers
        if (/\d/.test(password)) strength++;

        // Check for special characters
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        // Check length
        if (password.length >= 12) strength++;
        else if (password.length >= 8) strength += 0.5;

        let strengthClass, strengthWidth;

        if (strength <= 2) {
            strengthClass = 'weak';
            strengthWidth = '33%';
        } else if (strength <= 3.5) {
            strengthClass = 'medium';
            strengthWidth = '66%';
        } else {
            strengthClass = 'strong';
            strengthWidth = '100%';
        }

        strengthBar.className = `password-strength ${strengthClass}`;
        strengthBar.style.width = strengthWidth;
    }

    validatePasswordMatch() {
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-new-password').value;

        if (newPassword !== confirmPassword) {
            this.showAlert('Error', 'New passwords do not match');
        }
    }

    animateCounter(elementId, target, suffix = '') {
        const element = document.getElementById(elementId);
        const duration = 1000;
        const steps = 30;
        const increment = target / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = Math.round(current) + suffix;
        }, duration / steps);
    }

    showAlert(title, message, type = 'info') {
        const modal = document.getElementById('alert-modal');
        const alertTitle = document.getElementById('alert-title');
        const alertMessage = document.getElementById('alert-message');

        alertTitle.textContent = title;
        alertMessage.textContent = message;

        modal.classList.add('show');

        // Auto-hide after 3 seconds for non-critical alerts
        if (type !== 'critical') {
            setTimeout(() => {
                this.closeModal('alert-modal');
            }, 3000);
        }
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
    }

    showLoading() {
        // Loading state can be added if needed
    }

    hideLoading() {
        // Hide loading state
    }
}

// Global logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        fetch('api/logout.php', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(result => {
            window.location.href = 'index.html';
        })
        .catch(error => {
            window.location.href = 'index.html';
        });
    }
}

// Initialize profile manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.profileManager = new ProfileManager();
});