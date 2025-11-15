<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/session.php';

header('Content-Type: application/json');

$sessionManager = new SessionManager();
$sessionManager->requireRole('admin');

try {
    $database = new Database();

    // Get total users
    $totalUsersQuery = "SELECT COUNT(*) as count FROM users";
    $totalUsers = $database->fetchOne($totalUsersQuery)['count'];

    // Get active exams
    $activeExamsQuery = "SELECT COUNT(*) as count FROM exams WHERE status = 'active'";
    $activeExams = $database->fetchOne($activeExamsQuery)['count'];

    // Get total attempts
    $totalAttemptsQuery = "SELECT COUNT(*) as count FROM exam_attempts";
    $totalAttempts = $database->fetchOne($totalAttemptsQuery)['count'];

    // Get completion rate
    $completedAttemptsQuery = "SELECT COUNT(*) as count FROM exam_attempts WHERE status = 'completed'";
    $completedAttempts = $database->fetchOne($completedAttemptsQuery)['count'];
    $completionRate = $totalAttempts > 0 ? round(($completedAttempts / $totalAttempts) * 100, 1) : 0;

    // Get recent activity (last 10)
    $recentActivityQuery = "
        SELECT
            u.username,
            u.role,
            CASE
                WHEN ea.status = 'completed' THEN CONCAT('completed exam ', e.title)
                WHEN ea.status = 'in_progress' THEN CONCAT('started exam ', e.title)
                WHEN e.status = 'active' THEN CONCAT('created exam ', e.title)
                WHEN u.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 'registered new account'
                ELSE 'updated profile'
            END as action,
            GREATEST(
                COALESCE(ea.created_at, '1970-01-01'),
                COALESCE(e.created_at, '1970-01-01'),
                COALESCE(u.created_at, '1970-01-01')
            ) as timestamp
        FROM users u
        LEFT JOIN exam_attempts ea ON u.id = ea.user_id
        LEFT JOIN exams e ON ea.exam_id = e.id OR e.created_by = u.id
        WHERE
            (ea.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY) OR
             e.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY) OR
             u.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY))
        ORDER BY timestamp DESC
        LIMIT 10";

    $recentActivity = $database->fetchAll($recentActivityQuery);

    echo json_encode([
        'success' => true,
        'stats' => [
            'totalUsers' => $totalUsers,
            'activeExams' => $activeExams,
            'totalAttempts' => $totalAttempts,
            'completionRate' => $completionRate
        ],
        'recentActivity' => $recentActivity
    ]);

} catch (Exception $e) {
    error_log("Admin dashboard data error: " . $e->getMessage());

    echo json_encode([
        'success' => false,
        'message' => 'Failed to load dashboard data'
    ]);
}
?>