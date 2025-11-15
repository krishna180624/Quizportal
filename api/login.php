<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/session.php';

header('Content-Type: application/json');

// Rate limiting
$clientIp = $_SERVER['REMOTE_ADDR'];
$rateLimitKey = "login_attempts_{$clientIp}";

// Simple in-memory rate limiting (consider using Redis in production)
if (!isset($_SESSION['login_attempts'])) {
    $_SESSION['login_attempts'] = [];
}

$attempts = $_SESSION['login_attempts'];
$attempts = array_filter($attempts, function($time) {
    return (time() - $time) < LOGIN_ATTEMPT_WINDOW;
});

if (count($attempts) >= MAX_LOGIN_ATTEMPTS) {
    echo json_encode([
        'success' => false,
        'message' => 'Too many login attempts. Please try again later.'
    ]);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data || !isset($data['username']) || !isset($data['password'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Missing required fields'
        ]);
        exit();
    }

    $username = trim($data['username']);
    $password = $data['password'];
    $remember = isset($data['remember']) ? (bool)$data['remember'] : false;

    try {
        $database = new Database();

        // Find user by username or email
        $query = "SELECT id, username, email, password_hash, full_name, role, is_active
                  FROM users
                  WHERE (username = ? OR email = ?) AND is_active = 1";

        $user = $database->fetchOne($query, [$username, $username]);

        if (!$user) {
            // Record failed attempt
            $_SESSION['login_attempts'][] = time();

            echo json_encode([
                'success' => false,
                'message' => 'Invalid username or password'
            ]);
            exit();
        }

        // Verify password
        if (!password_verify($password, $user['password_hash'])) {
            // Record failed attempt
            $_SESSION['login_attempts'][] = time();

            echo json_encode([
                'success' => false,
                'message' => 'Invalid username or password'
            ]);
            exit();
        }

        // Clear failed attempts on successful login
        $_SESSION['login_attempts'] = [];

        // Create session
        $sessionManager = new SessionManager();
        $sessionManager->createSession($user['id'], $user['role'], $remember);

        // Remove sensitive data from response
        unset($user['password_hash']);

        echo json_encode([
            'success' => true,
            'user' => $user,
            'role' => $user['role'],
            'message' => 'Login successful'
        ]);

    } catch (Exception $e) {
        error_log("Login error: " . $e->getMessage());

        echo json_encode([
            'success' => false,
            'message' => 'Database error. Please try again later.'
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid request method'
    ]);
}
?>