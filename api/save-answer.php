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

if (!$data || !isset($data['attempt_id']) || !isset($data['answers'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid request data'
    ]);
    exit();
}

$attemptId = $data['attempt_id'];
$answers = $data['answers'];

try {
    $database = new Database();

    // Verify attempt belongs to current user and is in progress
    $attemptQuery = "SELECT * FROM exam_attempts
                     WHERE id = ? AND user_id = ? AND status = 'in_progress'";

    $attempt = $database->fetchOne($attemptQuery, [$attemptId, $userId]);

    if (!$attempt) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid attempt or attempt not found'
        ]);
        exit();
    }

    // Get questions to validate answers
    $questionsQuery = "SELECT * FROM questions
                       WHERE exam_id = (SELECT exam_id FROM exam_attempts WHERE id = ?)";

    $questions = $database->fetchAll($questionsQuery, [$attemptId]);

    $database->beginTransaction();

    // Delete existing answers for this attempt
    $database->executeQuery("DELETE FROM exam_answers WHERE attempt_id = ?", [$attemptId]);

    // Insert new answers
    foreach ($questions as $question) {
        $questionId = $question['id'];
        $answer = isset($answers[$questionId]) ? $answers[$questionId] : null;

        if ($answer !== null && $answer !== '') {
            $answerData = [
                'attempt_id' => $attemptId,
                'question_id' => $questionId
            ];

            // Handle different question types
            if ($question['question_type'] === 'multiple_choice') {
                $answerData['selected_option_id'] = is_numeric($answer) ? (int)$answer : null;
            } elseif ($question['question_type'] === 'true_false') {
                $answerData['selected_option_id'] = ($answer === 'true') ? 1 : 2; // Assuming true=1, false=2
            } elseif ($question['question_type'] === 'short_answer') {
                $answerData['answer_text'] = $answer;
            }

            // Insert answer
            $database->insert('exam_answers', $answerData);
        }
    }

    $database->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Answers saved successfully'
    ]);

} catch (Exception $e) {
    if ($database && $database->getConnection()->inTransaction()) {
        $database->rollback();
    }

    error_log("Save answer error: " . $e->getMessage());

    echo json_encode([
        'success' => false,
        'message' => 'Failed to save answers'
    ]);
}
?>