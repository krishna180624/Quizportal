<?php
require_once __DIR__ . '/../includes/session.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $sessionManager = new SessionManager();
        $sessionManager->destroySession();

        echo json_encode([
            'success' => true,
            'message' => 'Logged out successfully'
        ]);

    } catch (Exception $e) {
        error_log("Logout error: " . $e->getMessage());

        echo json_encode([
            'success' => false,
            'message' => 'Error during logout'
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid request method'
    ]);
}
?>