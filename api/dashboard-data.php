<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/session.php';

header('Content-Type: application/json');

$sessionManager = new SessionManager();
$sessionManager->requireAuth();

$userId = $sessionManager->getCurrentUserId();
$role = $sessionManager->getCurrentUserRole();

// Only students can access their dashboard
if ($role !== 'student') {
    echo json_encode([
        'success' => false,
        'message' => 'Access denied'
    ]);
    exit();
}

try {
    $database = new Database();
    $now = date('Y-m-d H:i:s');

    // Get upcoming exams
    $upcomingQuery = "SELECT e.* FROM exams e
                      LEFT JOIN exam_attempts ea ON e.id = ea.exam_id AND ea.user_id = ?
                      WHERE e.status = 'scheduled'
                      AND e.start_time > ?
                      AND (ea.id IS NULL OR ea.status = 'abandoned')
                      ORDER BY e.start_time ASC";

    $upcomingExams = $database->fetchAll($upcomingQuery, [$userId, $now]);

    // Get active exams (available to take)
    $activeQuery = "SELECT e.* FROM exams e
                   LEFT JOIN exam_attempts ea ON e.id = ea.exam_id AND ea.user_id = ?
                   WHERE e.status = 'active'
                   AND e.start_time <= ?
                   AND e.end_time >= ?
                   AND (ea.id IS NULL OR ea.status = 'abandoned')
                   ORDER BY e.start_time ASC";

    $activeExams = $database->fetchAll($activeQuery, [$userId, $now, $now]);

    // Get completed exams
    $completedQuery = "SELECT e.* FROM exams e
                      INNER JOIN exam_attempts ea ON e.id = ea.exam_id
                      WHERE ea.user_id = ?
                      AND ea.status = 'completed'
                      ORDER BY ea.end_time DESC";

    $completedExams = $database->fetchAll($completedQuery, [$userId]);

    // Get recent results with exam details
    $resultsQuery = "SELECT
                       ea.id as attempt_id,
                       ea.total_score,
                       ea.percentage,
                       ea.end_time,
                       e.title as exam_title,
                       e.total_marks,
                       e.passing_marks,
                       (e.passing_marks / e.total_marks * 100) as passing_percentage
                     FROM exam_attempts ea
                     INNER JOIN exams e ON ea.exam_id = e.id
                     WHERE ea.user_id = ?
                     AND ea.status = 'completed'
                     ORDER BY ea.end_time DESC
                     LIMIT 10";

    $results = $database->fetchAll($resultsQuery, [$userId]);

    echo json_encode([
        'success' => true,
        'exams' => [
            'upcoming' => $upcomingExams,
            'active' => $activeExams,
            'completed' => $completedExams
        ],
        'results' => $results
    ]);

} catch (Exception $e) {
    error_log("Dashboard data error: " . $e->getMessage());

    echo json_encode([
        'success' => false,
        'message' => 'Failed to load dashboard data'
    ]);
}
?>