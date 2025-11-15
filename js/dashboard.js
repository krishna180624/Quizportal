// Dashboard JavaScript

class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.exams = {
            upcoming: [],
            active: [],
            completed: []
        };
        this.results = [];

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
        document.getElementById('confirm-cancel').addEventListener('click', () => this.closeModal('confirm-modal'));
        document.getElementById('confirm-ok').addEventListener('click', () => this.handleConfirm());

        // Close modals on outside click
        document.getElementById('alert-modal').addEventListener('click', (e) => {
            if (e.target.id === 'alert-modal') this.closeModal('alert-modal');
        });
        document.getElementById('confirm-modal').addEventListener('click', (e) => {
            if (e.target.id === 'confirm-modal') this.closeModal('confirm-modal');
        });
    }

    async checkAuth() {
        try {
            const response = await fetch('api/check-session.php');
            const result = await response.json();

            if (!result.logged_in || result.role !== 'student') {
                this.showAlert('Access Denied', 'Please login as a student to access this page.');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
                return;
            }

            this.currentUser = result.user;
            document.getElementById('user-name').textContent = result.user.full_name;

        } catch (error) {
            console.error('Auth check error:', error);
            this.showAlert('Error', 'Authentication check failed. Please login again.');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    }

    async loadDashboardData() {
        try {
            const response = await fetch('api/dashboard-data.php');
            const result = await response.json();

            if (result.success) {
                this.exams = result.exams;
                this.results = result.results;
                this.updateStatistics();
                this.renderUpcomingExams();
                this.renderActiveExams();
                this.renderRecentResults();
            } else {
                this.showAlert('Error', 'Failed to load dashboard data');
            }
        } catch (error) {
            console.error('Dashboard data error:', error);
            this.showAlert('Error', 'Network error. Please try again.');
        }
    }

    updateStatistics() {
        const totalExams = this.exams.upcoming.length + this.exams.active.length + this.exams.completed.length;
        const completedExams = this.exams.completed.length;
        const upcomingExams = this.exams.upcoming.length;

        // Calculate average score
        const averageScore = this.results.length > 0
            ? Math.round(this.results.reduce((sum, result) => sum + result.percentage, 0) / this.results.length)
            : 0;

        // Update UI
        this.animateCounter('total-exams', totalExams);
        this.animateCounter('completed-exams', completedExams);
        this.animateCounter('upcoming-exams', upcomingExams);
        this.animateCounter('average-score', averageScore, '%');
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

    renderUpcomingExams() {
        const container = document.getElementById('upcoming-exams-grid');

        if (this.exams.upcoming.length === 0) {
            container.innerHTML = '<div class="no-exams-message"><p>No upcoming exams scheduled.</p></div>';
            return;
        }

        container.innerHTML = this.exams.upcoming.map(exam => this.createExamCard(exam, 'upcoming')).join('');
    }

    renderActiveExams() {
        const container = document.getElementById('active-exams-grid');

        if (this.exams.active.length === 0) {
            container.innerHTML = '<div class="no-exams-message"><p>No active exams available.</p></div>';
            return;
        }

        container.innerHTML = this.exams.active.map(exam => this.createExamCard(exam, 'active')).join('');
    }

    renderRecentResults() {
        const tableBody = document.getElementById('recent-results-table');

        if (this.results.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No recent results available.</td></tr>';
            return;
        }

        tableBody.innerHTML = this.results.slice(0, 5).map(result => this.createResultRow(result)).join('');
    }

    createExamCard(exam, type) {
        const startDate = new Date(exam.start_time);
        const endDate = new Date(exam.end_time);
        const now = new Date();

        let statusBadge = '';
        let actionButton = '';

        if (type === 'upcoming') {
            const daysUntil = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));
            statusBadge = `<span class="status-badge status-scheduled">Starts in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}</span>`;
            actionButton = '<button class="btn btn-secondary disabled" disabled>Not Available</button>';
        } else {
            statusBadge = '<span class="status-badge status-active">Available Now</span>';
            actionButton = `<button class="btn btn-primary" onclick="dashboardManager.startExam(${exam.id})">Start Exam</button>`;
        }

        return `
            <div class="exam-card">
                <h3>${exam.title}</h3>
                <div class="exam-meta">
                    <span><strong>Duration:</strong> ${exam.duration_minutes} minutes</span>
                    <span><strong>Total Marks:</strong> ${exam.total_marks}</span>
                    <span><strong>Passing Marks:</strong> ${exam.passing_marks}</span>
                    <span><strong>Start:</strong> ${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString()}</span>
                    <span><strong>End:</strong> ${endDate.toLocaleDateString()} ${endDate.toLocaleTimeString()}</span>
                </div>
                <div class="exam-description">${exam.description || 'No description available'}</div>
                <div style="margin-top: 1rem;">
                    ${statusBadge}
                </div>
                <div style="margin-top: 1rem;">
                    ${actionButton}
                </div>
            </div>
        `;
    }

    createResultRow(result) {
        const date = new Date(result.end_time);
        const statusClass = result.percentage >= result.passing_percentage ? 'status-completed' : 'status-active';
        const statusText = result.percentage >= result.passing_percentage ? 'Passed' : 'Failed';

        return `
            <tr>
                <td>${result.exam_title}</td>
                <td>${date.toLocaleDateString()} ${date.toLocaleTimeString()}</td>
                <td>${result.total_score}/${result.total_marks} (${result.percentage}%)</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-secondary" onclick="dashboardManager.viewResult(${result.id})">View Details</button>
                </td>
            </tr>
        `;
    }

    startExam(examId) {
        this.confirmAction(
            'Start Exam',
            'Are you ready to start this exam? Once started, the timer will begin and you must complete it within the time limit.',
            () => {
                window.location.href = `exam.html?id=${examId}`;
            }
        );
    }

    viewResult(resultId) {
        window.location.href = `results.html?result=${resultId}`;
    }

    confirmAction(title, message, onConfirm) {
        this.currentConfirmAction = onConfirm;

        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        document.getElementById('confirm-modal').classList.add('show');
    }

    handleConfirm() {
        if (this.currentConfirmAction) {
            this.currentConfirmAction();
        }
        this.closeModal('confirm-modal');
    }

    showAlert(title, message, type = 'info') {
        const modal = document.getElementById('alert-modal');
        const alertTitle = document.getElementById('alert-title');
        const alertMessage = document.getElementById('alert-message');

        alertTitle.textContent = title;
        alertMessage.textContent = message;

        modal.classList.add('show');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
    }

    showLoading() {
        document.getElementById('loading-overlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading-overlay').style.display = 'none';
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
            if (result.success) {
                window.location.href = 'index.html';
            }
        })
        .catch(error => {
            console.error('Logout error:', error);
            window.location.href = 'index.html';
        });
    }
}

// Initialize dashboard manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardManager = new DashboardManager();
});