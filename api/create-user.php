<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/session.php';

header('Content-Type: application/json');

$sessionManager = new SessionManager();
$sessionManager->requireRole('admin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid request method'
    ]);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['username']) || !isset($data['email']) || !isset($data['password']) || !isset($data['full_name'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Missing required fields'
    ]);
    exit();
}

$username = trim($data['username']);
$email = trim($data['email']);
$password = $data['password'];
$fullName = trim($data['full_name']);
$role = $data['role'] ?? 'student';

try {
    $database = new Database();

    // Validate role
    if (!in_array($role, ['student', 'admin'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid role specified'
        ]);
        exit();
    }

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
            'message' => 'Failed to create user'
        ]);
        exit();
    }

    echo json_encode([
        'success' => true,
        'message' => 'User created successfully',
        'user_id' => $userId
    ]);

} catch (Exception $e) {
    error_log("Create user error: " . $e->getMessage());

    echo json_encode([
        'success' => false,
        'message' => 'Database error. Please try again.'
    ]);
}
?>