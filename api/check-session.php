<?php
require_once __DIR__ . '/../includes/session.php';

header('Content-Type: application/json');

$sessionManager = new SessionManager();

if ($sessionManager->isLoggedIn()) {
    $user = $sessionManager->getCurrentUser();

    echo json_encode([
        'logged_in' => true,
        'user' => $user,
        'role' => $user['role']
    ]);
} else {
    echo json_encode([
        'logged_in' => false
    ]);
}
?>