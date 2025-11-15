<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/session.php';

header('Content-Type: application/json');

$sessionManager = new SessionManager();
$sessionManager->requireAuth();

$userId = $sessionManager->getCurrentUserId();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid request method'
    ]);
    exit();
}

try {
    $database = new Database();

    $fullName = trim($_POST['full_name'] ?? '');
    $email = trim($_POST['email'] ?? '');

    // Validation
    if (empty($fullName) || strlen($fullName) < 2) {
        echo json_encode([
            'success' => false,
            'message' => 'Full name must be at least 2 characters'
        ]);
        exit();
    }

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode([
            'success' => false,
            'message' => 'Please enter a valid email address'
        ]);
        exit();
    }

    // Check if email is already taken by another user
    $existingEmailQuery = "SELECT id FROM users WHERE email = ? AND id != ?";
    $existingEmail = $database->fetchOne($existingEmailQuery, [$email, $userId]);

    if ($existingEmail) {
        echo json_encode([
            'success' => false,
            'message' => 'Email is already registered by another user'
        ]);
        exit();
    }

    $updateData = [
        'full_name' => $fullName,
        'email' => $email
    ];

    // Handle profile image upload
    if (isset($_FILES['profile_image']) && $_FILES['profile_image']['error'] === UPLOAD_ERR_OK) {
        $uploadResult = $this->handleProfileImageUpload($_FILES['profile_image'], $userId);

        if ($uploadResult['success']) {
            $updateData['profile_image'] = $uploadResult['filename'];
        } else {
            echo json_encode([
                'success' => false,
                'message' => $uploadResult['message']
            ]);
            exit();
        }
    }

    // Update user profile
    $success = $database->update('users', $updateData, 'id = ?', [$userId]);

    if ($success) {
        echo json_encode([
            'success' => true,
            'message' => 'Profile updated successfully'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Failed to update profile'
        ]);
    }

} catch (Exception $e) {
    error_log("Update profile error: " . $e->getMessage());

    echo json_encode([
        'success' => false,
        'message' => 'Database error. Please try again.'
    ]);
}

function handleProfileImageUpload($file, $userId) {
    // Validate file
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    $maxSize = 2097152; // 2MB

    if (!in_array($file['type'], $allowedTypes)) {
        return ['success' => false, 'message' => 'Only JPG, PNG, and GIF files are allowed'];
    }

    if ($file['size'] > $maxSize) {
        return ['success' => false, 'message' => 'File size must be less than 2MB'];
    }

    // Create uploads directory if it doesn't exist
    $uploadDir = __DIR__ . '/../uploads/profiles/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // Generate unique filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'user_' . $userId . '_' . time() . '.' . $extension;
    $uploadPath = $uploadDir . $filename;

    // Move uploaded file
    if (move_uploaded_file($file['tmp_name'], $uploadPath)) {
        return ['success' => true, 'filename' => $filename];
    } else {
        return ['success' => false, 'message' => 'Failed to upload file'];
    }
}
?>