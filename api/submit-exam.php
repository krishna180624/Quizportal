<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/session.php';

header('Content-Type: application/json');

$sessionManager = new SessionManager();
$sessionManager->requireAuth();

$userId = $sessionManager->getCurrentUserId();
$role = $sessionManager->getCurrentUserRole();

if ($role !== 'student') {
    echo json_encode([
        'success' => false,
        'message' => 'Access denied'
    ]);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid request method'
    ]);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['attempt_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid request data'
    ]);
    exit();
}

$attemptId = $data['attempt_id'];

try {
    $database = new Database();

    // Verify attempt belongs to current user and is in progress
    $attemptQuery = "SELECT ea.*, e.total_marks, e.passing_marks, e.duration_minutes
                     FROM exam_attempts ea
                     INNER JOIN exams e ON ea.exam_id = e.id
                     WHERE ea.id = ? AND ea.user_id = ? AND ea.status = 'in_progress'";

    $attempt = $database->fetchOne($attemptQuery, [$attemptId, $userId]);

    if (!$attempt) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid attempt or attempt not found'
        ]);
        exit();
    }

    $examId = $attempt['exam_id'];
    $totalMarks = $attempt['total_marks'];
    $passingMarks = $attempt['passing_marks'];

    // Get all questions for this exam
    $questionsQuery = "SELECT * FROM questions WHERE exam_id = ?";
    $questions = $database->fetchAll($questionsQuery, [$examId]);

    $totalScore = 0;
    $gradedQuestions = 0;

    // Grade each question
    foreach ($questions as $question) {
        $questionId = $question['id'];
        $questionMarks = $question['marks'];

        // Get student's answer
        $studentAnswerQuery = "SELECT * FROM exam_answers
                              WHERE attempt_id = ? AND question_id = ?";

        $studentAnswer = $database->fetchOne($studentAnswerQuery, [$attemptId, $questionId]);

        if ($studentAnswer) {
            $marksObtained = 0;

            if ($question['question_type'] === 'multiple_choice') {
                // Multiple choice grading
                if ($studentAnswer['selected_option_id']) {
                    $correctOptionQuery = "SELECT is_correct FROM question_options
                                           WHERE id = ? AND question_id = ? AND is_correct = 1";

                    $isCorrect = $database->fetchOne($correctOptionQuery, [$studentAnswer['selected_option_id'], $questionId]);

                    if ($isCorrect) {
                        $marksObtained = $questionMarks;
                    }
                }
            } elseif ($question['question_type'] === 'true_false') {
                // True/false grading
                $correctAnswerQuery = "SELECT id FROM question_options
                                     WHERE question_id = ? AND is_correct = 1";

                $correctAnswer = $database->fetchOne($correctAnswerQuery, [$questionId]);

                if ($correctAnswer && $studentAnswer['selected_option_id'] == $correctAnswer['id']) {
                    $marksObtained = $questionMarks;
                }
            } elseif ($question['question_type'] === 'short_answer') {
                // Short answer grading (simplified - in production, you might want more sophisticated matching)
                $answerText = trim(strtolower($studentAnswer['answer_text'] ?? ''));
                if (!empty($answerText)) {
                    // For demo purposes, give partial marks for non-empty answers
                    // In production, implement proper answer matching
                    $marksObtained = floor($questionMarks * 0.5); // 50% for attempting
                }
            }

            // Update the answer with grading
            $database->update('exam_answers', [
                'is_correct' => $marksObtained > 0,
                'marks_obtained' => $marksObtained
            ], 'attempt_id = ? AND question_id = ?', [$attemptId, $questionId]);

            $totalScore += $marksObtained;
            $gradedQuestions++;
        }
    }

    // Calculate percentage
    $percentage = $totalMarks > 0 ? round(($totalScore / $totalMarks) * 100, 2) : 0;

    // Update the attempt with final results
    $database->update('exam_attempts', [
        'end_time' => date('Y-m-d H:i:s'),
        'status' => 'completed',
        'total_score' => $totalScore,
        'percentage' => $percentage
    ], 'id = ?', [$attemptId]);

    echo json_encode([
        'success' => true,
        'score' => $totalScore,
        'percentage' => $percentage,
        'total_marks' => $totalMarks,
        'passing_marks' => $passingMarks,
        'passed' => $totalScore >= $passingMarks,
        'message' => 'Exam submitted successfully'
    ]);

} catch (Exception $e) {
    error_log("Submit exam error: " . $e->getMessage());

    echo json_encode([
        'success' => false,
        'message' => 'Failed to submit exam'
    ]);
}
?>