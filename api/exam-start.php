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

$examId = $_GET['exam_id'] ?? null;

if (!$examId) {
    echo json_encode([
        'success' => false,
        'message' => 'Exam ID is required'
    ]);
    exit();
}

try {
    $database = new Database();
    $now = date('Y-m-d H:i:s');

    // Get exam details
    $examQuery = "SELECT * FROM exams
                  WHERE id = ? AND status = 'active'
                  AND start_time <= ? AND end_time >= ?";

    $exam = $database->fetchOne($examQuery, [$examId, $now, $now]);

    if (!$exam) {
        echo json_encode([
            'success' => false,
            'message' => 'Exam is not available or not active'
        ]);
        exit();
    }

    // Check if user already has an attempt
    $attemptQuery = "SELECT * FROM exam_attempts
                     WHERE user_id = ? AND exam_id = ?
                     AND status != 'abandoned'";

    $existingAttempt = $database->fetchOne($attemptQuery, [$userId, $examId]);

    if ($existingAttempt && $existingAttempt['status'] === 'in_progress') {
        // Continue existing attempt
        $attemptId = $existingAttempt['id'];
    } elseif ($existingAttempt && $existingAttempt['status'] === 'completed') {
        echo json_encode([
            'success' => false,
            'message' => 'You have already completed this exam'
        ]);
        exit();
    } else {
        // Create new attempt
        $attemptId = $database->insert('exam_attempts', [
            'user_id' => $userId,
            'exam_id' => $examId,
            'start_time' => $now,
            'status' => 'in_progress'
        ]);

        if (!$attemptId) {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to start exam attempt'
            ]);
            exit();
        }
    }

    // Get questions for this exam
    $questionsQuery = "SELECT q.*,
                             GROUP_CONCAT(
                                 CONCAT(qo.id, ':', qo.option_text, ':', qo.is_correct, ':', qo.order)
                                 SEPARATOR '|'
                             ) as options_data
                      FROM questions q
                      LEFT JOIN question_options qo ON q.id = qo.question_id
                      WHERE q.exam_id = ?
                      GROUP BY q.id
                      ORDER BY q.order";

    $questionsData = $database->fetchAll($questionsQuery, [$examId]);

    $questions = [];

    foreach ($questionsData as $questionData) {
        $options = [];

        if ($questionData['options_data']) {
            $optionsData = explode('|', $questionData['options_data']);

            foreach ($optionsData as $optionData) {
                if ($optionData) {
                    list($id, $text, $isCorrect, $order) = explode(':', $optionData);
                    $options[] = [
                        'id' => (int)$id,
                        'option_text' => $text,
                        'is_correct' => (bool)$isCorrect,
                        'order' => (int)$order
                    ];
                }
            }

            // Sort options by order
            usort($options, function($a, $b) {
                return $a['order'] - $b['order'];
            });
        }

        $questions[] = [
            'id' => $questionData['id'],
            'question_text' => $questionData['question_text'],
            'question_type' => $questionData['question_type'],
            'marks' => $questionData['marks'],
            'order' => $questionData['order'],
            'options' => $options
        ];
    }

    echo json_encode([
        'success' => true,
        'exam' => [
            'id' => $exam['id'],
            'title' => $exam['title'],
            'description' => $exam['description'],
            'duration_minutes' => $exam['duration_minutes'],
            'total_marks' => $exam['total_marks'],
            'passing_marks' => $exam['passing_marks']
        ],
        'attempt_id' => $attemptId,
        'questions' => $questions
    ]);

} catch (Exception $e) {
    error_log("Exam start error: " . $e->getMessage());

    echo json_encode([
        'success' => false,
        'message' => 'Failed to start exam'
    ]);
}
?>