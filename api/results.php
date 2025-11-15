<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/session.php';

header('Content-Type: application/json');

$sessionManager = new SessionManager();
$sessionManager->requireAuth();

$userId = $sessionManager->getCurrentUserId();
$role = $sessionManager->getCurrentUserRole();
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$exam = isset($_GET['exam']) ? trim($_GET['exam']) : '';
$days = isset($_GET['days']) ? (int)$_GET['days'] : null;
$resultId = isset($_GET['result']) ? (int)$_GET['result'] : null;

$limit = 10;
$offset = ($page - 1) * $limit;

try {
    $database = new Database();

    // If specific result requested
    if ($resultId) {
        $resultQuery = "
            SELECT
                ea.id,
                ea.total_score as score,
                ea.percentage,
                ea.end_time as completed_at,
                ea.duration_minutes,
                e.title as exam_title,
                e.total_marks,
                e.passing_marks,
                (e.passing_marks / e.total_marks * 100) as passing_percentage,
                u.username as student_name
            FROM exam_attempts ea
            INNER JOIN exams e ON ea.exam_id = e.id
            INNER JOIN users u ON ea.user_id = u.id
            WHERE ea.id = ? AND ea.status = 'completed'";

        // Admin can view any result, users can only view their own
        if ($role !== 'admin') {
            $resultQuery .= " AND ea.user_id = ?";
            $result = $database->fetchOne($resultQuery, [$resultId, $userId]);
        } else {
            $result = $database->fetchOne($resultQuery, [$resultId]);
        }

        if ($result) {
            echo json_encode([
                'success' => true,
                'result' => $result
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Result not found'
            ]);
        }
        exit;
    }

    // Build WHERE clause for list view
    $where = ["ea.status = 'completed'"];
    $params = [];

    if ($role !== 'admin') {
        $where[] = "ea.user_id = ?";
        $params[] = $userId;
    }

    if ($exam) {
        $where[] = "e.title LIKE ?";
        $params[] = "%$exam%";
    }

    if ($days) {
        $where[] = "ea.end_time >= DATE_SUB(NOW(), INTERVAL ? DAY)";
        $params[] = $days;
    }

    $whereClause = implode(' AND ', $where);

    // Get total count for pagination
    $countQuery = "
        SELECT COUNT(*) as total
        FROM exam_attempts ea
        INNER JOIN exams e ON ea.exam_id = e.id
        WHERE $whereClause";

    $totalResult = $database->fetchOne($countQuery, $params);
    $total = $totalResult['total'];

    // Get results list
    $resultsQuery = "
        SELECT
            ea.id,
            e.title as exam_title,
            ea.total_score as score,
            e.total_marks,
            ea.percentage,
            ea.end_time as completed_at,
            ea.duration_minutes,
            (e.passing_marks / e.total_marks * 100) as passing_percentage
        FROM exam_attempts ea
        INNER JOIN exams e ON ea.exam_id = e.id
        WHERE $whereClause
        ORDER BY ea.end_time DESC
        LIMIT ? OFFSET ?";

    $results = $database->fetchAll($resultsQuery, array_merge($params, [$limit, $offset]));

    // Get pagination info
    $totalPages = ceil($total / $limit);
    $pagination = [
        'currentPage' => $page,
        'totalPages' => $totalPages,
        'totalItems' => $total,
        'itemsPerPage' => $limit,
        'hasNext' => $page < $totalPages,
        'hasPrev' => $page > 1
    ];

    echo json_encode([
        'success' => true,
        'results' => $results,
        'pagination' => $pagination
    ]);

} catch (Exception $e) {
    error_log("Results error: " . $e->getMessage());

    echo json_encode([
        'success' => false,
        'message' => 'Failed to load results'
    ]);
}
?>