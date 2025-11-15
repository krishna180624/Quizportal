// Admin Dashboard JavaScript

class AdminManager {
    constructor() {
        this.currentUser = null;
        this.currentTab = 'overview';
        this.currentPage = {
            users: 1,
            exams: 1,
            results: 1
        };
        this.searchFilters = {
            users: { search: '', role: '' },
            exams: { search: '', status: '' },
            results: { search: '', exam: '' }
        };

        this.init();
    }

    async init() {
        this.initEventListeners();
        await this.checkAuth();
        await this.loadDashboardData();
        this.hideLoading();
    }

    initEventListeners() {
        // Modal event listeners
        document.getElementById('alert-ok').addEventListener('click', () => this.closeModal('alert-modal'));

        document.getElementById('alert-modal').addEventListener('click', (e) => {
            if (e.target.id === 'alert-modal') this.closeModal('alert-modal');
        });

        // Form event listeners
        document.getElementById('create-user-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createUser();
        });

        document.getElementById('create-exam-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createExam();
        });

        // Search event listeners
        document.getElementById('user-search').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.searchUsers();
        });

        document.getElementById('exam-search').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.searchExams();
        });

        document.getElementById('result-search').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.searchResults();
        });
    }

    async checkAuth() {
        try {
            const response = await fetch('api/check-session.php');
            const result = await response.json();

            if (!result.logged_in || result.role !== 'admin') {
                this.showAlert('Access Denied', 'Please login as an administrator to access this page.');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
                return false;
            }

            this.currentUser = result.user;
            document.getElementById('admin-name').textContent = result.user.full_name;

            return true;
        } catch (error) {
            console.error('Auth check error:', error);
            return false;
        }
    }

    async loadDashboardData() {
        try {
            const response = await fetch('api/admin-dashboard-data.php');
            const result = await response.json();

            if (result.success) {
                this.updateDashboardStats(result.stats);
                this.displayRecentActivity(result.recentActivity);
            } else {
                this.showAlert('Error', 'Failed to load dashboard data');
            }
        } catch (error) {
            console.error('Dashboard data error:', error);
            this.showAlert('Error', 'Network error. Please try again.');
        }
    }

    updateDashboardStats(stats) {
        this.animateCounter('total-users', stats.totalUsers);
        this.animateCounter('active-exams', stats.activeExams);
        this.animateCounter('total-attempts', stats.totalAttempts);
        this.animateCounter('completion-rate', stats.completionRate, '%');
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

    displayRecentActivity(activities) {
        const container = document.getElementById('recent-activity-list');

        if (activities.length === 0) {
            container.innerHTML = '<div class="activity-item"><div class="activity-info">No recent activity found.</div></div>';
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-info">
                    <div><span class="activity-user">${activity.username}</span> ${activity.action}</div>
                    <div class="activity-time">${this.formatDate(activity.timestamp)}</div>
                </div>
            </div>
        `).join('');
    }

    showTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Show selected tab
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Update current tab
        this.currentTab = tabName;

        // Load tab-specific data
        this.loadTabData(tabName);
    }

    async loadTabData(tabName) {
        switch (tabName) {
            case 'users':
                await this.loadUsers();
                break;
            case 'exams':
                await this.loadExams();
                break;
            case 'results':
                await this.loadResults();
                break;
            case 'reports':
                // Reports tab doesn't need initial data loading
                break;
        }
    }

    async loadUsers() {
        try {
            const response = await fetch(`api/users.php?page=${this.currentPage.users}&search=${this.searchFilters.users.search}&role=${this.searchFilters.users.role}`);
            const result = await response.json();

            if (result.success) {
                this.displayUsers(result.users);
                this.updatePagination('users', result.pagination);
            } else {
                this.showAlert('Error', 'Failed to load users');
            }
        } catch (error) {
            console.error('Load users error:', error);
            this.showAlert('Error', 'Network error. Please try again.');
        }
    }

    displayUsers(users) {
        const tbody = document.getElementById('users-table-body');

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No users found.</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.full_name}</td>
                <td>${user.email}</td>
                <td><span class="status-badge status-${user.role}">${user.role}</span></td>
                <td><span class="status-badge status-${user.is_active ? 'active' : 'scheduled'}">${user.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>${this.formatDate(user.created_at)}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-secondary" onclick="adminManager.editUser(${user.id})">Edit</button>
                        <button class="btn btn-danger" onclick="adminManager.deleteUser(${user.id}, '${user.username}')">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async loadExams() {
        try {
            const response = await fetch(`api/exams.php?page=${this.currentPage.exams}&search=${this.searchFilters.exams.search}&status=${this.searchFilters.exams.status}`);
            const result = await response.json();

            if (result.success) {
                this.displayExams(result.exams);
                this.updatePagination('exams', result.pagination);
            } else {
                this.showAlert('Error', 'Failed to load exams');
            }
        } catch (error) {
            console.error('Load exams error:', error);
            this.showAlert('Error', 'Network error. Please try again.');
        }
    }

    displayExams(exams) {
        const tbody = document.getElementById('exams-table-body');

        if (exams.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No exams found.</td></tr>';
            return;
        }

        tbody.innerHTML = exams.map(exam => `
            <tr>
                <td>${exam.id}</td>
                <td>${exam.title}</td>
                <td>${exam.duration_minutes} min</td>
                <td><span class="status-badge status-${exam.status}">${exam.status}</span></td>
                <td>${this.formatDate(exam.start_time)}</td>
                <td>${this.formatDate(exam.end_time)}</td>
                <td>${exam.created_by_name}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-secondary" onclick="adminManager.editExam(${exam.id})">Edit</button>
                        <button class="btn btn-danger" onclick="adminManager.deleteExam(${exam.id}, '${exam.title}')">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async loadResults() {
        try {
            const response = await fetch(`api/results.php?page=${this.currentPage.results}&search=${this.searchFilters.results.search}&exam=${this.searchFilters.results.exam}`);
            const result = await response.json();

            if (result.success) {
                this.displayResults(result.results);
                this.updatePagination('results', result.pagination);
            } else {
                this.showAlert('Error', 'Failed to load results');
            }
        } catch (error) {
            console.error('Load results error:', error);
            this.showAlert('Error', 'Network error. Please try again.');
        }
    }

    displayResults(results) {
        const tbody = document.getElementById('results-table-body');

        if (results.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No results found.</td></tr>';
            return;
        }

        tbody.innerHTML = results.map(result => `
            <tr>
                <td>${result.id}</td>
                <td>${result.student_name}</td>
                <td>${result.exam_title}</td>
                <td>${result.total_score}/${result.total_marks}</td>
                <td>${result.percentage}%</td>
                <td><span class="status-badge status-${result.status}">${result.status}</span></td>
                <td>${this.formatDate(result.end_time)}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-secondary" onclick="adminManager.viewResult(${result.id})">View Details</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    searchUsers() {
        this.searchFilters.users.search = document.getElementById('user-search').value;
        this.searchFilters.users.role = document.getElementById('user-role-filter').value;
        this.currentPage.users = 1;
        this.loadUsers();
    }

    searchExams() {
        this.searchFilters.exams.search = document.getElementById('exam-search').value;
        this.searchFilters.exams.status = document.getElementById('exam-status-filter').value;
        this.currentPage.exams = 1;
        this.loadExams();
    }

    searchResults() {
        this.searchFilters.results.search = document.getElementById('result-search').value;
        this.searchFilters.results.exam = document.getElementById('result-exam-filter').value;
        this.currentPage.results = 1;
        this.loadResults();
    }

    updatePagination(type, pagination) {
        const container = document.getElementById(`${type}-pagination`);

        if (pagination.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';

        // Previous button
        html += `<button ${pagination.currentPage <= 1 ? 'disabled' : ''} onclick="adminManager.goToPage('${type}', ${pagination.currentPage - 1})">Previous</button>`;

        // Page numbers
        for (let i = 1; i <= pagination.totalPages; i++) {
            if (i === 1 || i === pagination.totalPages || (i >= pagination.currentPage - 2 && i <= pagination.currentPage + 2)) {
                html += `<button class="${i === pagination.currentPage ? 'active' : ''}" onclick="adminManager.goToPage('${type}', ${i})">${i}</button>`;
            } else if (i === pagination.currentPage - 3 || i === pagination.currentPage + 3) {
                html += '<span>...</span>';
            }
        }

        // Next button
        html += `<button ${pagination.currentPage >= pagination.totalPages ? 'disabled' : ''} onclick="adminManager.goToPage('${type}', ${pagination.currentPage + 1})">Next</button>`;

        container.innerHTML = html;
    }

    goToPage(type, page) {
        this.currentPage[type] = page;
        this.loadTabData(type);
    }

    showCreateUserModal() {
        document.getElementById('create-user-modal').classList.add('show');
        document.getElementById('create-user-form').reset();
    }

    async createUser() {
        const formData = {
            full_name: document.getElementById('new-user-fullname').value.trim(),
            username: document.getElementById('new-user-username').value.trim(),
            email: document.getElementById('new-user-email').value.trim(),
            password: document.getElementById('new-user-password').value,
            role: document.getElementById('new-user-role').value
        };

        if (!this.validateUserData(formData)) {
            return;
        }

        try {
            const response = await fetch('api/create-user.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('Success', 'User created successfully');
                this.closeModal('create-user-modal');
                if (this.currentTab === 'users') {
                    this.loadUsers();
                }
            } else {
                this.showAlert('Error', result.message);
            }
        } catch (error) {
            console.error('Create user error:', error);
            this.showAlert('Error', 'Network error. Please try again.');
        }
    }

    showCreateExamModal() {
        document.getElementById('create-exam-modal').classList.add('show');
        document.getElementById('create-exam-form').reset();
    }

    async createExam() {
        const formData = {
            title: document.getElementById('new-exam-title').value.trim(),
            description: document.getElementById('new-exam-description').value.trim(),
            duration_minutes: parseInt(document.getElementById('new-exam-duration').value),
            total_marks: parseInt(document.getElementById('new-exam-total-marks').value),
            passing_marks: parseInt(document.getElementById('new-exam-passing-marks').value),
            start_time: document.getElementById('new-exam-start-time').value,
            end_time: document.getElementById('new-exam-end-time').value,
            status: document.getElementById('new-exam-status').value
        };

        if (!this.validateExamData(formData)) {
            return;
        }

        try {
            const response = await fetch('api/create-exam.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('Success', 'Exam created successfully');
                this.closeModal('create-exam-modal');
                if (this.currentTab === 'exams') {
                    this.loadExams();
                }
            } else {
                this.showAlert('Error', result.message);
            }
        } catch (error) {
            console.error('Create exam error:', error);
            this.showAlert('Error', 'Network error. Please try again.');
        }
    }

    validateUserData(data) {
        if (!data.full_name || data.full_name.length < 2) {
            this.showAlert('Error', 'Full name must be at least 2 characters');
            return false;
        }

        if (!data.username || data.username.length < 3) {
            this.showAlert('Error', 'Username must be at least 3 characters');
            return false;
        }

        if (!data.email || !data.email.includes('@')) {
            this.showAlert('Error', 'Please enter a valid email address');
            return false;
        }

        if (!data.password || data.password.length < 8) {
            this.showAlert('Error', 'Password must be at least 8 characters');
            return false;
        }

        return true;
    }

    validateExamData(data) {
        if (!data.title || data.title.length < 3) {
            this.showAlert('Error', 'Exam title must be at least 3 characters');
            return false;
        }

        if (!data.duration_minutes || data.duration_minutes < 1) {
            this.showAlert('Error', 'Duration must be at least 1 minute');
            return false;
        }

        if (!data.total_marks || data.total_marks < 1) {
            this.showAlert('Error', 'Total marks must be at least 1');
            return false;
        }

        if (!data.passing_marks || data.passing_marks < 1) {
            this.showAlert('Error', 'Passing marks must be at least 1');
            return false;
        }

        if (data.passing_marks > data.total_marks) {
            this.showAlert('Error', 'Passing marks cannot be greater than total marks');
            return false;
        }

        if (!data.start_time || !data.end_time) {
            this.showAlert('Error', 'Start and end times are required');
            return false;
        }

        if (new Date(data.start_time) >= new Date(data.end_time)) {
            this.showAlert('Error', 'End time must be after start time');
            return false;
        }

        return true;
    }

    editUser(userId) {
        this.showAlert('Info', 'User editing feature coming soon');
    }

    deleteUser(userId, username) {
        if (confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
            this.performDeleteUser(userId);
        }
    }

    async performDeleteUser(userId) {
        try {
            const response = await fetch(`api/delete-user.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user_id: userId })
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('Success', 'User deleted successfully');
                if (this.currentTab === 'users') {
                    this.loadUsers();
                }
            } else {
                this.showAlert('Error', result.message);
            }
        } catch (error) {
            console.error('Delete user error:', error);
            this.showAlert('Error', 'Network error. Please try again.');
        }
    }

    editExam(examId) {
        this.showAlert('Info', 'Exam editing feature coming soon');
    }

    deleteExam(examId, examTitle) {
        if (confirm(`Are you sure you want to delete exam "${examTitle}"? This action cannot be undone.`)) {
            this.performDeleteExam(examId);
        }
    }

    async performDeleteExam(examId) {
        try {
            const response = await fetch(`api/delete-exam.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ exam_id: examId })
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('Success', 'Exam deleted successfully');
                if (this.currentTab === 'exams') {
                    this.loadExams();
                }
            } else {
                this.showAlert('Error', result.message);
            }
        } catch (error) {
            console.error('Delete exam error:', error);
            this.showAlert('Error', 'Network error. Please try again.');
        }
    }

    viewResult(resultId) {
        window.location.href = `results.html?result=${resultId}&admin=true`;
    }

    async generateReport(type) {
        try {
            this.showAlert('Info', 'Generating report...');

            const response = await fetch(`api/generate-report.php?type=${type}`);
            const result = await response.json();

            if (result.success) {
                // Create download link
                const blob = new Blob([result.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${type}_report_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);

                this.showAlert('Success', 'Report generated and downloaded successfully');
            } else {
                this.showAlert('Error', result.message);
            }
        } catch (error) {
            console.error('Generate report error:', error);
            this.showAlert('Error', 'Network error. Please try again.');
        }
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
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

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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

// Initialize admin manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminManager = new AdminManager();
});

[Response interrupted by a tool use result. Only one tool may be used at a time and should be placed at the end of the message.]