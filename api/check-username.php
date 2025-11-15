<?php
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data || !isset($data['username'])) {
        echo json_encode([
            'available' => false,
            'message' => 'Username is required'
        ]);
        exit();
    }

    $username = trim($data['username']);

    if (strlen($username) < 3) {
        echo json_encode([
            'available' => false,
            'message' => 'Username must be at least 3 characters'
        ]);
        exit();
    }

    if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
        echo json_encode([
            'available' => false,
            'message' => 'Username can only contain letters, numbers, and underscores'
        ]);
        exit();
    }

    try {
        $database = new Database();

        $existingUser = $database->fetchOne(
            "SELECT id FROM users WHERE username = ?",
            [$username]
        );

        if ($existingUser) {
            echo json_encode([
                'available' => false,
                'message' => 'Username is already taken'
            ]);
        } else {
            echo json_encode([
                'available' => true,
                'message' => 'Username is available'
            ]);
        }

    } catch (Exception $e) {
        error_log("Username check error: " . $e->getMessage());

        echo json_encode([
            'available' => false,
            'message' => 'Database error. Please try again.'
        ]);
    }
} else {
    echo json_encode([
        'available' => false,
        'message' => 'Invalid request method'
    ]);
}
?>