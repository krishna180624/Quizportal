<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/session.php';

header('Content-Type: application/json');

$sessionManager = new SessionManager();
$sessionManager->requireRole('admin');

$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$role = isset($_GET['role']) ? $_GET['role'] : '';

$limit = 10;
$offset = ($page - 1) * $limit;

try {
    $database = new Database();

    // Build WHERE clause
    $where = ['1=1'];
    $params = [];

    if ($search) {
        $where[] = "(u.username LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)";
        $searchParam = "%$search%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
    }

    if ($role) {
        $where[] = "u.role = ?";
        $params[] = $role;
    }

    $whereClause = implode(' AND ', $where);

    // Get total count for pagination
    $countQuery = "SELECT COUNT(*) as total FROM users u WHERE $whereClause";
    $totalResult = $database->fetchOne($countQuery, $params);
    $total = $totalResult['total'];

    // Get users
    $usersQuery = "
        SELECT
            u.id,
            u.username,
            u.full_name,
            u.email,
            u.role,
            u.is_active,
            u.created_at
        FROM users u
        WHERE $whereClause
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?";

    $users = $database->fetchAll($usersQuery, array_merge($params, [$limit, $offset]));

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
        'users' => $users,
        'pagination' => $pagination
    ]);

} catch (Exception $e) {
    error_log("Users list error: " . $e->getMessage());

    echo json_encode([
        'success' => false,
        'message' => 'Failed to load users'
    ]);
}
?>