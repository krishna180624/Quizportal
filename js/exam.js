// Exam JavaScript

class ExamManager {
    constructor() {
        this.examId = null;
        this.examTitle = '';
        this.duration = 0;
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.answers = {};
        this.markedForReview = {};
        this.attemptId = null;
        this.startTime = null;
        this.timerInterval = null;
        this.remainingTime = 0;
        this.autoSaveInterval = null;

        this.init();
    }

    async init() {
        this.initEventListeners();
        await this.checkAuth();
        await this.loadExam();
        this.setupExam();
        this.startExam();
    }

    initEventListeners() {
        // Modal event listeners
        document.getElementById('alert-ok').addEventListener('click', () => this.closeModal('alert-modal'));

        document.getElementById('alert-modal').addEventListener('click', (e) => {
            if (e.target.id === 'alert-modal') this.closeModal('alert-modal');
        });

        // Prevent navigation away
        window.addEventListener('beforeunload', (e) => {
            if (this.attemptId) {
                e.preventDefault();
                e.returnValue = 'Your exam is in progress. Are you sure you want to leave?';
            }
        });

        // Prevent right-click (basic anti-cheating)
        document.addEventListener('contextmenu', (e) => {
            if (this.attemptId) {
                e.preventDefault();
            }
        });

        // Handle visibility change (student switching tabs)
        document.addEventListener('visibilitychange', () => {
            if (this.attemptId && document.hidden) {
                // Log tab switch for potential monitoring
                console.warn('Student switched tabs during exam');
            }
        });

        // Auto-save text answers
        document.addEventListener('input', (e) => {
            if (e.target.id === 'short-answer-text') {
                this.saveAnswer();
            }
        });
    }

    async checkAuth() {
        try {
            const response = await fetch('api/check-session.php');
            const result = await response.json();

            if (!result.logged_in || result.role !== 'student') {
                this.showAlert('Access Denied', 'Please login as a student to take exams.');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Auth check error:', error);
            return false;
        }
    }

    async loadExam() {
        const urlParams = new URLSearchParams(window.location.search);
        this.examId = urlParams.get('id');

        if (!this.examId) {
            this.showAlert('Error', 'No exam ID provided.');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            return;
        }

        try {
            const response = await fetch(`api/exam-start.php?exam_id=${this.examId}`);
            const result = await response.json();

            if (!result.success) {
                this.showAlert('Error', result.message);
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
                return;
            }

            this.examTitle = result.exam.title;
            this.duration = result.exam.duration_minutes;
            this.questions = result.questions;
            this.attemptId = result.attempt_id;
            this.startTime = new Date();
            this.remainingTime = this.duration * 60; // Convert to seconds

        } catch (error) {
            console.error('Load exam error:', error);
            this.showAlert('Error', 'Failed to load exam. Please try again.');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        }
    }

    setupExam() {
        // Hide loading, show exam content
        document.getElementById('exam-loading').style.display = 'none';
        document.getElementById('exam-content').style.display = 'block';

        // Set exam title
        document.getElementById('exam-title').textContent = this.examTitle;

        // Generate question navigation
        this.generateQuestionNav();

        // Display first question
        this.displayQuestion(0);

        // Update progress
        this.updateProgress();
    }

    startExam() {
        // Start timer
        this.startTimer();

        // Start auto-save
        this.startAutoSave();

        // Disable full screen restrictions (for development, enable in production)
        this.enforceExamMode();
    }

    generateQuestionNav() {
        const navContainer = document.getElementById('question-nav');
        navContainer.innerHTML = '';

        for (let i = 0; i < this.questions.length; i++) {
            const button = document.createElement('button');
            button.className = 'question-nav-btn unanswered';
            button.textContent = i + 1;
            button.onclick = () => this.goToQuestion(i);
            button.id = `question-nav-${i}`;
            navContainer.appendChild(button);
        }
    }

    displayQuestion(index) {
        if (index < 0 || index >= this.questions.length) {
            return;
        }

        this.currentQuestionIndex = index;
        const question = this.questions[index];

        // Update question counter
        document.getElementById('question-counter').textContent = `Question ${index + 1} of ${this.questions.length}`;

        // Update question text
        document.getElementById('question-text').textContent = question.question_text;

        // Update navigation buttons
        this.updateNavigationButtons(index);

        // Update active nav button
        document.querySelectorAll('.question-nav-btn').forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
        });

        // Display question type specific content
        this.displayQuestionContent(question);

        // Update progress
        this.updateProgress();
    }

    displayQuestionContent(question) {
        // Hide all question type containers
        document.getElementById('multiple-choice-options').style.display = 'none';
        document.getElementById('true-false-options').style.display = 'none';
        document.getElementById('short-answer-input').style.display = 'none';

        switch (question.question_type) {
            case 'multiple_choice':
                this.displayMultipleChoice(question);
                break;
            case 'true_false':
                this.displayTrueFalse(question);
                break;
            case 'short_answer':
                this.displayShortAnswer(question);
                break;
        }
    }

    displayMultipleChoice(question) {
        const container = document.getElementById('multiple-choice-options');
        container.style.display = 'block';
        container.innerHTML = '';

        // Sort options by order
        const sortedOptions = question.options.sort((a, b) => a.order - b.order);

        sortedOptions.forEach((option, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option-item';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `question_${question.id}`;
            radio.value = option.id;
            radio.id = `option_${option.id}`;

            // Check if this option was previously selected
            if (this.answers[question.id] == option.id) {
                radio.checked = true;
                optionDiv.classList.add('selected');
            }

            radio.onchange = () => {
                this.selectOption(option.id, optionDiv);
            };

            const label = document.createElement('label');
            label.className = 'option-label';
            label.htmlFor = `option_${option.id}`;
            label.textContent = option.option_text;

            optionDiv.appendChild(radio);
            optionDiv.appendChild(label);
            container.appendChild(optionDiv);

            // Make the entire option clickable
            optionDiv.onclick = (e) => {
                if (e.target.type !== 'radio') {
                    radio.checked = true;
                    this.selectOption(option.id, optionDiv);
                }
            };
        });
    }

    displayTrueFalse(question) {
        const container = document.getElementById('true-false-options');
        container.style.display = 'block';
        container.innerHTML = '';

        const options = [
            { id: 'true', text: 'True' },
            { id: 'false', text: 'False' }
        ];

        options.forEach((option, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option-item';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `question_${question.id}`;
            radio.value = option.id;
            radio.id = `tf_option_${option.id}`;

            // Check if this option was previously selected
            if (this.answers[question.id] === option.id) {
                radio.checked = true;
                optionDiv.classList.add('selected');
            }

            radio.onchange = () => {
                this.selectOption(option.id, optionDiv);
            };

            const label = document.createElement('label');
            label.className = 'option-label';
            label.htmlFor = `tf_option_${option.id}`;
            label.textContent = option.text;

            optionDiv.appendChild(radio);
            optionDiv.appendChild(label);
            container.appendChild(optionDiv);

            // Make the entire option clickable
            optionDiv.onclick = (e) => {
                if (e.target.type !== 'radio') {
                    radio.checked = true;
                    this.selectOption(option.id, optionDiv);
                }
            };
        });
    }

    displayShortAnswer(question) {
        const container = document.getElementById('short-answer-input');
        container.style.display = 'block';

        const textarea = document.getElementById('short-answer-text');
        textarea.value = this.answers[question.id] || '';

        // Mark as answered if there's content
        if (this.answers[question.id] && this.answers[question.id].trim()) {
            this.markQuestionAsAnswered(question.id);
        }
    }

    selectOption(optionId, optionDiv) {
        const questionId = this.questions[this.currentQuestionIndex].id;

        // Remove selected class from all options in this question
        optionDiv.parentElement.querySelectorAll('.option-item').forEach(item => {
            item.classList.remove('selected');
        });

        // Add selected class to clicked option
        optionDiv.classList.add('selected');

        // Save answer
        this.answers[questionId] = optionId;
        this.markQuestionAsAnswered(questionId);

        // Auto-save
        this.saveAnswer();
    }

    markQuestionAsAnswered(questionId) {
        // Find the question index
        const questionIndex = this.questions.findIndex(q => q.id === questionId);
        if (questionIndex !== -1) {
            const navButton = document.getElementById(`question-nav-${questionIndex}`);
            if (navButton) {
                navButton.classList.remove('unanswered');
                navButton.classList.add('answered');
            }
        }
    }

    updateNavigationButtons(index) {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const submitBtn = document.getElementById('submit-btn');

        // Previous button
        prevBtn.disabled = index === 0;

        // Next/Submit button
        if (index === this.questions.length - 1) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'inline-block';
        } else {
            nextBtn.style.display = 'inline-block';
            submitBtn.style.display = 'none';
        }
    }

    updateProgress() {
        const answeredQuestions = Object.keys(this.answers).length;
        const totalQuestions = this.questions.length;
        const percentage = (answeredQuestions / totalQuestions) * 100;

        document.getElementById('progress-text').textContent = `${answeredQuestions}/${totalQuestions}`;
        document.getElementById('progress-fill').style.width = `${percentage}%`;
    }

    goToQuestion(index) {
        this.displayQuestion(index);
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.goToQuestion(this.currentQuestionIndex + 1);
        }
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.goToQuestion(this.currentQuestionIndex - 1);
        }
    }

    markForReview() {
        const questionId = this.questions[this.currentQuestionIndex].id;
        this.markedForReview[questionId] = !this.markedForReview[questionId];

        const navButton = document.getElementById(`question-nav-${this.currentQuestionIndex}`);
        if (navButton) {
            if (this.markedForReview[questionId]) {
                navButton.innerHTML = '📌<br>' + (this.currentQuestionIndex + 1);
                navButton.style.backgroundColor = '#fff3cd';
                navButton.style.borderColor = '#ffc107';
            } else {
                navButton.innerHTML = (this.currentQuestionIndex + 1);
                navButton.style.backgroundColor = '';
                navButton.style.borderColor = '';
            }
        }

        this.showAlert('Marked for Review',
            this.markedForReview[questionId] ?
            'Question marked for review.' :
            'Review mark removed.');
    }

    startTimer() {
        this.updateTimerDisplay();

        this.timerInterval = setInterval(() => {
            this.remainingTime--;

            if (this.remainingTime <= 0) {
                clearInterval(this.timerInterval);
                this.autoSubmitExam();
            } else if (this.remainingTime <= 300) { // 5 minutes warning
                document.getElementById('exam-timer').classList.add('warning');
            }

            this.updateTimerDisplay();
        }, 1000);
    }

    updateTimerDisplay() {
        const hours = Math.floor(this.remainingTime / 3600);
        const minutes = Math.floor((this.remainingTime % 3600) / 60);
        const seconds = this.remainingTime % 60;

        const display = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('timer-display').textContent = display;
    }

    startAutoSave() {
        // Auto-save every 30 seconds
        this.autoSaveInterval = setInterval(() => {
            this.saveAnswer();
        }, 30000);
    }

    async saveAnswer() {
        // Save current short answer if it exists
        const currentQuestion = this.questions[this.currentQuestionIndex];
        if (currentQuestion.question_type === 'short_answer') {
            const textarea = document.getElementById('short-answer-text');
            if (textarea) {
                this.answers[currentQuestion.id] = textarea.value;
                if (textarea.value.trim()) {
                    this.markQuestionAsAnswered(currentQuestion.id);
                }
            }
        }

        // Send to server
        try {
            const response = await fetch('api/save-answer.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    attempt_id: this.attemptId,
                    answers: this.answers
                })
            });

            const result = await response.json();
            if (!result.success) {
                console.error('Failed to save answer:', result.message);
            }
        } catch (error) {
            console.error('Save answer error:', error);
        }
    }

    showSubmitConfirmation() {
        const answeredCount = Object.keys(this.answers).length;
        const totalCount = this.questions.length;
        const unansweredCount = totalCount - answeredCount;

        let summary = `
            <div><strong>Total Questions:</strong> ${totalCount}</div>
            <div><strong>Answered:</strong> ${answeredCount}</div>
            <div><strong>Unanswered:</strong> ${unansweredCount}</div>
            <div><strong>Time Remaining:</strong> ${document.getElementById('timer-display').textContent}</div>
        `;

        if (unansweredCount > 0) {
            summary += `<div style="color: var(--warning-color); margin-top: 0.5rem;">
                ⚠️ You have ${unansweredCount} unanswered question${unansweredCount > 1 ? 's' : ''}.
            </div>`;
        }

        document.getElementById('submit-summary').innerHTML = summary;
        document.getElementById('submit-modal').classList.add('show');
    }

    closeSubmitModal() {
        document.getElementById('submit-modal').classList.remove('show');
    }

    async submitExam() {
        this.closeSubmitModal();

        try {
            // Final save before submission
            await this.saveAnswer();

            const response = await fetch('api/submit-exam.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    attempt_id: this.attemptId
                })
            });

            const result = await response.json();

            if (result.success) {
                // Clear timers
                clearInterval(this.timerInterval);
                clearInterval(this.autoSaveInterval);

                // Redirect to results
                window.location.href = `results.html?attempt=${this.attemptId}`;
            } else {
                this.showAlert('Submission Failed', result.message);
            }
        } catch (error) {
            console.error('Submit exam error:', error);
            this.showAlert('Error', 'Failed to submit exam. Please try again.');
        }
    }

    async autoSubmitExam() {
        // Save current answers
        await this.saveAnswer();

        // Show time up message
        this.showAlert('Time\'s Up!', 'Your time has expired. The exam is being submitted automatically.');

        // Submit after a short delay
        setTimeout(() => {
            this.submitExam();
        }, 2000);
    }

    enforceExamMode() {
        // In production, you might want to:
        // 1. Disable keyboard shortcuts (Ctrl+C, Ctrl+V, etc.)
        // 2. Prevent copy/paste
        // 3. Disable right-click
        // 4. Monitor for window focus changes
        // 5. Prevent browser back button

        document.addEventListener('keydown', (e) => {
            // Prevent F5 refresh
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
                e.preventDefault();
            }
        });
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
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
}

// Global logout function
function logout() {
    if (confirm('Are you sure you want to logout? Any unsaved exam progress will be lost.')) {
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

// Initialize exam manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.examManager = new ExamManager();
});