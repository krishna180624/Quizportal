<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/session.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    $requiredFields = ['username', 'email', 'password', 'full_name', 'role'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || empty(trim($data[$field]))) {
            echo json_encode([
                'success' => false,
                'message' => "Field '$field' is required"
            ]);
            exit();
        }
    }

    $username = trim($data['username']);
    $email = trim($data['email']);
    $password = $data['password'];
    $fullName = trim($data['full_name']);
    $role = $data['role'];

    // Validate role
    if (!in_array($role, ['student', 'admin'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid role specified'
        ]);
        exit();
    }

    // Validate username format
    if (strlen($username) < 3 || !preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
        echo json_encode([
            'success' => false,
            'message' => 'Username must be at least 3 characters and contain only letters, numbers, and underscores'
        ]);
        exit();
    }

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email format'
        ]);
        exit();
    }

    // Validate password strength
    if (strlen($password) < 8 || !preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/', $password)) {
        echo json_encode([
            'success' => false,
            'message' => 'Password must be at least 8 characters with uppercase, lowercase, and numbers'
        ]);
        exit();
    }

    // Validate full name
    if (strlen($fullName) < 2) {
        echo json_encode([
            'success' => false,
            'message' => 'Full name must be at least 2 characters'
        ]);
        exit();
    }

    try {
        $database = new Database();

        // Check if username already exists
        $existingUser = $database->fetchOne(
            "SELECT id FROM users WHERE username = ?",
            [$username]
        );

        if ($existingUser) {
            echo json_encode([
                'success' => false,
                'message' => 'Username is already taken'
            ]);
            exit();
        }

        // Check if email already exists
        $existingEmail = $database->fetchOne(
            "SELECT id FROM users WHERE email = ?",
            [$email]
        );

        if ($existingEmail) {
            echo json_encode([
                'success' => false,
                'message' => 'Email is already registered'
            ]);
            exit();
        }

        // Hash password
        $passwordHash = password_hash($password, PASSWORD_DEFAULT, ['cost' => HASH_COST]);

        // Insert new user
        $userId = $database->insert('users', [
            'username' => $username,
            'email' => $email,
            'password_hash' => $passwordHash,
            'full_name' => $fullName,
            'role' => $role,
            'is_active' => 1
        ]);

        if (!$userId) {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to create user account'
            ]);
            exit();
        }

        // Get created user data
        $newUser = $database->fetchOne(
            "SELECT id, username, email, full_name, role, created_at
             FROM users WHERE id = ?",
            [$userId]
        );

        echo json_encode([
            'success' => true,
            'user' => $newUser,
            'message' => 'Registration successful'
        ]);

    } catch (Exception $e) {
        error_log("Registration error: " . $e->getMessage());

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