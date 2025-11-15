<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/session.php';

header('Content-Type: application/json');

$sessionManager = new SessionManager();
$sessionManager->requireAuth();

$userId = $sessionManager->getCurrentUserId();
$role = $sessionManager->getCurrentUserRole();

try {
    $database = new Database();

    // Get exam statistics
    $statsQuery = "
        SELECT
            COUNT(CASE WHEN ea.status = 'completed' THEN 1 END) as total_exams,
            COALESCE(AVG(CASE WHEN ea.status = 'completed' THEN ea.percentage END), 0) as average_score,
            COUNT(CASE WHEN ea.status = 'completed' AND ea.percentage >= (e.passing_marks / e.total_marks * 100) THEN 1 END) as completed_exams,
            COALESCE(MAX(CASE WHEN ea.status = 'completed' THEN ea.percentage END), 0) as best_score
        FROM exam_attempts ea
        INNER JOIN exams e ON ea.exam_id = e.id
        WHERE ea.user_id = ?";

    $stats = $database->fetchOne($statsQuery, [$userId]);

    // Get exam history
    $historyQuery = "
        SELECT
            ea.id,
            e.title as exam_title,
            ea.score,
            e.total_marks,
            ea.percentage,
            ea.end_time as completed_at,
            ea.duration_minutes,
            (e.passing_marks / e.total_marks * 100) as passing_percentage
        FROM exam_attempts ea
        INNER JOIN exams e ON ea.exam_id = e.id
        WHERE ea.user_id = ? AND ea.status = 'completed'
        ORDER BY ea.end_time DESC
        LIMIT 10";

    $history = $database->fetchAll($historyQuery, [$userId]);

    echo json_encode([
        'success' => true,
        'stats' => [
            'totalExams' => (int)$stats['total_exams'],
            'averageScore' => round($stats['average_score'], 1),
            'completedExams' => (int)$stats['completed_exams'],
            'bestScore' => round($stats['best_score'], 1)
        ],
        'history' => $history
    ]);

} catch (Exception $e) {
    error_log("Profile stats error: " . $e->getMessage());

    echo json_encode([
        'success' => false,
        'message' => 'Failed to load profile data'
    ]);
}
?>