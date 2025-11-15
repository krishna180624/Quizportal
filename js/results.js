// Results Viewing JavaScript

class ResultsManager {
    constructor() {
        this.currentUser = null;
        this.results = [];
        this.filters = {
            exam: '',
            dateRange: ''
        };
        this.isAdmin = false;

        this.init();
    }

    async init() {
        this.initEventListeners();
        await this.checkAuth();
        this.parseUrlParams();
        await this.loadResults();
        this.hideLoading();
    }

    initEventListeners() {
        // Modal event listeners
        document.getElementById('alert-ok').addEventListener('click', () => this.closeModal('alert-modal'));

        document.getElementById('alert-modal').addEventListener('click', (e) => {
            if (e.target.id === 'alert-modal') this.closeModal('alert-modal');
        });
    }

    async checkAuth() {
        try {
            const response = await fetch('api/check-session.php');
            const result = await response.json();

            if (!result.logged_in) {
                this.showAlert('Access Denied', 'Please login to view your results.');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
                return false;
            }

            this.currentUser = result.user;
            this.isAdmin = result.role === 'admin';
            return true;
        } catch (error) {
            console.error('Auth check error:', error);
            return false;
        }
    }

    parseUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);

        if (urlParams.get('result')) {
            // Show specific result
            this.showSpecificResult(urlParams.get('result'));
        }

        if (urlParams.get('admin')) {
            // Admin view
            this.isAdmin = true;
            // Hide filters for admin when viewing specific result
            if (urlParams.get('result')) {
                document.getElementById('filters-section').style.display = 'none';
            }
        }
    }

    async loadResults() {
        try {
            let apiUrl = 'api/results.php';
            const params = new URLSearchParams();

            if (this.filters.exam) {
                params.append('exam', this.filters.exam);
            }

            if (this.filters.dateRange) {
                params.append('days', this.filters.dateRange);
            }

            if (params.toString()) {
                apiUrl += '?' + params.toString();
            }

            const response = await fetch(apiUrl);
            const result = await response.json();

            if (result.success) {
                this.results = result.results;
                this.displayResults();
                this.loadExamFilter();
            } else {
                this.showAlert('Error', 'Failed to load results');
            }
        } catch (error) {
            console.error('Load results error:', error);
            this.showAlert('Error', 'Network error. Please try again.');
        }
    }

    loadExamFilter() {
        const examFilter = document.getElementById('exam-filter');

        // Get unique exams from results
        const uniqueExams = [...new Set(this.results.map(r => r.exam_title))].sort();

        examFilter.innerHTML = '<option value="">All Exams</option>';
        uniqueExams.forEach(exam => {
            examFilter.innerHTML += `<option value="${exam}">${exam}</option>`;
        });
    }

    displayResults() {
        const container = document.getElementById('results-container');
        container.innerHTML = '';

        if (this.results.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No results found.</div>';
            return;
        }

        if (this.results.length === 1 && !this.filters.exam && !this.filters.dateRange) {
            // Show detailed view for single result
            this.displayDetailedResult(this.results[0]);
        } else {
            // Show list view
            this.displayResultsList();
        }
    }

    displayResultsList() {
        const container = document.getElementById('results-container');

        container.innerHTML = `
            <div class="results-summary">
                <h2>Results Summary</h2>
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="value">${this.results.length}</div>
                        <div class="label">Total Attempts</div>
                    </div>
                    <div class="summary-item">
                        <div class="value">${this.calculateAverage()}%</div>
                        <div class="label">Average Score</div>
                    </div>
                    <div class="summary-item">
                        <div class="value">${this.getPassCount()}</div>
                        <div class="label">Passed Exams</div>
                    </div>
                    <div class="summary-item">
                        <div class="value">${this.getBestScore()}%</div>
                        <div class="label">Best Score</div>
                    </div>
                </div>
            </div>

            <div class="result-details">
                <h2>Recent Results</h2>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Exam</th>
                                <th>Date</th>
                                <th>Score</th>
                                <th>Percentage</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.results.map(result => this.createResultRow(result)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="performance-chart">
                <h2>Performance Over Time</h2>
                <div class="chart-container">
                    <canvas id="performance-chart"></canvas>
                </div>
            </div>
        `;

        this.createPerformanceChart();
    }

    createResultRow(result) {
        const date = new Date(result.completed_at);
        const passed = result.percentage >= result.passing_percentage;
        const statusClass = passed ? 'status-active' : 'status-scheduled';
        const statusText = passed ? 'Passed' : 'Failed';

        return `
            <tr>
                <td>${result.exam_title}</td>
                <td>${date.toLocaleDateString()} ${date.toLocaleTimeString()}</td>
                <td>${result.score}/${result.total_marks}</td>
                <td>${result.percentage}%</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-secondary" onclick="resultsManager.viewDetails(${result.id})">View Details</button>
                </td>
            </tr>
        `;
    }

    displayDetailedResult(result) {
        const container = document.getElementById('results-container');

        const passed = result.percentage >= result.passing_percentage;
        const statusClass = passed ? 'correct' : 'incorrect';
        const statusText = passed ? 'Passed' : 'Failed';

        container.innerHTML = `
            <div class="results-summary">
                <h2>Exam Result - ${result.exam_title}</h2>
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="value">${result.score}/${result.total_marks}</div>
                        <div class="label">Score</div>
                    </div>
                    <div class="summary-item">
                        <div class="value">${result.percentage}%</div>
                        <div class="label">Percentage</div>
                    </div>
                    <div class="summary-item">
                        <div class="value status-${statusClass}">${statusText}</div>
                        <div class="label">Status</div>
                    </div>
                    <div class="summary-item">
                        <div class="value">${result.duration_minutes} min</div>
                        <div class="label">Duration</div>
                    </div>
                </div>

                <div class="progress-bar">
                    <div class="progress-fill ${statusClass}" style="width: ${result.percentage}%">
                        ${result.percentage}%
                    </div>
                </div>
            </div>

            <div class="result-details">
                <h2>Question Breakdown</h2>
                <div class="question-breakdown" id="question-breakdown">
                    <!-- Questions will be loaded here -->
                </div>
            </div>

            ${passed && !this.isAdmin ? `
                <div class="certificate-section">
                    <h2>🏆 Certificate of Completion</h2>
                    <p>Congratulations! You have successfully passed this exam.</p>
                    <button class="btn btn-secondary download-certificate" onclick="resultsManager.downloadCertificate(${result.id})">
                        Download Certificate
                    </button>
                </div>
            ` : ''}
        `;

        this.loadQuestionBreakdown(result.id);
    }

    async loadQuestionBreakdown(attemptId) {
        try {
            const response = await fetch(`api/question-breakdown.php?attempt_id=${attemptId}`);
            const result = await response.json();

            if (result.success) {
                this.displayQuestionBreakdown(result.questions);
            } else {
                document.getElementById('question-breakdown').innerHTML =
                    '<div class="alert alert-warning">Question breakdown not available.</div>';
            }
        } catch (error) {
            console.error('Load question breakdown error:', error);
            document.getElementById('question-breakdown').innerHTML =
                '<div class="alert alert-error">Failed to load question breakdown.</div>';
        }
    }

    displayQuestionBreakdown(questions) {
        const container = document.getElementById('question-breakdown');

        container.innerHTML = questions.map(question => {
            const isCorrect = question.is_correct;
            const resultClass = isCorrect ? 'correct' : 'incorrect';
            const resultText = isCorrect ? 'Correct' : 'Incorrect';
            const resultIcon = isCorrect ? '✓' : '✗';

            return `
                <div class="question-item">
                    <div class="question-info">
                        <div class="question-text">Q${question.order}: ${question.question_text}</div>
                        <div class="question-meta">
                            ${question.question_type === 'multiple_choice' ? 'Multiple Choice' :
                              question.question_type === 'true_false' ? 'True/False' : 'Short Answer'}
                              • ${question.marks} marks
                        </div>
                        ${question.student_answer ? `
                            <div class="question-meta">
                                <strong>Your Answer:</strong> ${question.student_answer}
                            </div>
                        ` : ''}
                        ${question.correct_answer ? `
                            <div class="question-meta">
                                <strong>Correct Answer:</strong> ${question.correct_answer}
                            </div>
                        ` : ''}
                    </div>
                    <div class="question-result">
                        <div class="result-mark ${resultClass}">${resultIcon}</div>
                        <div class="result-mark ${resultClass}">${question.marks_obtained}/${question.marks}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    createPerformanceChart() {
        const canvas = document.getElementById('performance-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.prepareChartData();

        // Simple line chart implementation
        const width = canvas.width = canvas.offsetWidth;
        const height = canvas.height = canvas.offsetHeight;
        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        if (data.labels.length === 0) return;

        // Find max value for scaling
        const maxValue = Math.max(...data.values);

        // Draw axes
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // Draw data points and lines
        ctx.strokeStyle = '#3498db';
        ctx.fillStyle = '#3498db';
        ctx.lineWidth = 2;

        const xStep = chartWidth / (data.labels.length - 1);

        ctx.beginPath();
        data.values.forEach((value, index) => {
            const x = padding + index * xStep;
            const y = height - padding - (value / 100) * chartHeight;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Draw data points
        data.values.forEach((value, index) => {
            const x = padding + index * xStep;
            const y = height - padding - (value / 100) * chartHeight;

            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Draw labels
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        data.labels.forEach((label, index) => {
            const x = padding + index * xStep;
            ctx.save();
            ctx.translate(x, height - padding + 20);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(label, 0, 0);
            ctx.restore();
        });
    }

    prepareChartData() {
        const sortedResults = [...this.results].sort((a, b) =>
            new Date(a.completed_at) - new Date(b.completed_at));

        return {
            labels: sortedResults.map(r =>
                new Date(r.completed_at).toLocaleDateString()),
            values: sortedResults.map(r => r.percentage)
        };
    }

    showSpecificResult(resultId) {
        // Load specific result
        this.loadSpecificResult(resultId);
    }

    async loadSpecificResult(resultId) {
        try {
            const response = await fetch(`api/result-details.php?id=${resultId}`);
            const result = await response.json();

            if (result.success) {
                this.displayDetailedResult(result.result);
            } else {
                this.showAlert('Error', 'Failed to load result details');
            }
        } catch (error) {
            console.error('Load specific result error:', error);
            this.showAlert('Error', 'Network error. Please try again.');
        }
    }

    viewDetails(resultId) {
        if (this.isAdmin) {
            window.location.href = `results.html?result=${resultId}&admin=true`;
        } else {
            window.location.href = `results.html?result=${resultId}`;
        }
    }

    calculateAverage() {
        if (this.results.length === 0) return 0;
        const sum = this.results.reduce((acc, r) => acc + r.percentage, 0);
        return Math.round(sum / this.results.length);
    }

    getPassCount() {
        return this.results.filter(r => r.percentage >= r.passing_percentage).length;
    }

    getBestScore() {
        if (this.results.length === 0) return 0;
        return Math.max(...this.results.map(r => r.percentage));
    }

    applyFilters() {
        this.filters.exam = document.getElementById('exam-filter').value;
        this.filters.dateRange = document.getElementById('date-range-filter').value;
        this.loadResults();
    }

    async downloadCertificate(resultId) {
        try {
            const response = await fetch(`api/generate-certificate.php?result_id=${resultId}`);
            const result = await response.json();

            if (result.success) {
                // Create download link
                const blob = new Blob([result.html], { type: 'text/html' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `certificate_${resultId}.html`;
                a.click();
                window.URL.revokeObjectURL(url);

                this.showAlert('Success', 'Certificate downloaded successfully');
            } else {
                this.showAlert('Error', result.message);
            }
        } catch (error) {
            console.error('Download certificate error:', error);
            this.showAlert('Error', 'Network error. Please try again.');
        }
    }

    exportResults(format) {
        const data = this.prepareExportData();

        if (format === 'csv') {
            this.exportCSV(data);
        } else if (format === 'pdf') {
            this.showAlert('Info', 'PDF export coming soon');
        }
    }

    prepareExportData() {
        return this.results.map(result => ({
            'Exam': result.exam_title,
            'Date': new Date(result.completed_at).toLocaleString(),
            'Score': `${result.score}/${result.total_marks}`,
            'Percentage': `${result.percentage}%`,
            'Status': result.percentage >= result.passing_percentage ? 'Passed' : 'Failed',
            'Duration': `${result.duration_minutes} minutes`
        }));
    }

    exportCSV(data) {
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `results_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        this.showAlert('Success', 'Results exported to CSV');
    }

    printResults() {
        window.print();
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

    hideLoading() {
        document.getElementById('results-loading').style.display = 'none';
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

// Initialize results manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.resultsManager = new ResultsManager();
});