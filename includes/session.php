<?php
// Session Management

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

class SessionManager {
    private $database;

    public function __construct() {
        $this->database = new Database();

        // Start session if not already started
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    public function createSession($userId, $role, $remember = false) {
        // Regenerate session ID to prevent session fixation
        session_regenerate_id(true);

        $_SESSION['user_id'] = $userId;
        $_SESSION['role'] = $role;
        $_SESSION['login_time'] = time();
        $_SESSION['ip_address'] = $_SERVER['REMOTE_ADDR'];
        $_SESSION['user_agent'] = $_SERVER['HTTP_USER_AGENT'];

        // Set remember me cookie if requested
        if ($remember) {
            $token = bin2hex(random_bytes(32));
            $expiry = time() + (30 * 24 * 60 * 60); // 30 days

            setcookie('remember_token', $token, $expiry, '/', '', true, true);

            // Store token in database (implement this as needed)
            // This is a simplified version
        }
    }

    public function validateSession() {
        // Check if session exists
        if (!isset($_SESSION['user_id'])) {
            return false;
        }

        // Check session timeout
        if (isset($_SESSION['login_time'])) {
            $elapsed = time() - $_SESSION['login_time'];
            if ($elapsed > SESSION_TIMEOUT) {
                $this->destroySession();
                return false;
            }

            // Refresh login time
            $_SESSION['login_time'] = time();
        }

        // Check IP address (prevent session hijacking)
        if (isset($_SESSION['ip_address']) && $_SESSION['ip_address'] !== $_SERVER['REMOTE_ADDR']) {
            $this->destroySession();
            return false;
        }

        // Check user agent (additional security)
        if (isset($_SESSION['user_agent']) && $_SESSION['user_agent'] !== $_SERVER['HTTP_USER_AGENT']) {
            $this->destroySession();
            return false;
        }

        return true;
    }

    public function isLoggedIn() {
        return $this->validateSession();
    }

    public function getCurrentUserId() {
        return $this->isLoggedIn() ? $_SESSION['user_id'] : null;
    }

    public function getCurrentUserRole() {
        return $this->isLoggedIn() ? $_SESSION['role'] : null;
    }

    public function requireAuth() {
        if (!$this->isLoggedIn()) {
            $response = [
                'success' => false,
                'message' => 'Authentication required'
            ];
            echo json_encode($response);
            exit();
        }
    }

    public function requireRole($requiredRole) {
        $this->requireAuth();

        if ($_SESSION['role'] !== $requiredRole) {
            $response = [
                'success' => false,
                'message' => 'Insufficient permissions'
            ];
            echo json_encode($response);
            exit();
        }
    }

    public function getCurrentUser() {
        if (!$this->isLoggedIn()) {
            return null;
        }

        try {
            $query = "SELECT id, username, email, full_name, role, profile_image, created_at
                     FROM users WHERE id = ? AND is_active = 1";
            return $this->database->fetchOne($query, [$_SESSION['user_id']]);
        } catch (Exception $e) {
            return null;
        }
    }

    public function destroySession() {
        // Destroy session data
        $_SESSION = [];

        // Delete session cookie
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }

        // Destroy session
        session_destroy();

        // Clear remember me cookie
        setcookie('remember_token', '', time() - 3600, '/', '', true, true);
    }

    public function getCsrfToken() {
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }

    public function validateCsrfToken($token) {
        if (!isset($_SESSION['csrf_token'])) {
            return false;
        }

        return hash_equals($_SESSION['csrf_token'], $token);
    }

    public function flashMessage($type, $message) {
        $_SESSION['flash'][$type] = $message;
    }

    public function getFlashMessages() {
        $messages = $_SESSION['flash'] ?? [];
        unset($_SESSION['flash']);
        return $messages;
    }
}

// Create session manager instance
$sessionManager = new SessionManager();

// Auto-check session for API calls
if (strpos($_SERVER['REQUEST_URI'], '/api/') !== false) {
    // For API endpoints, validate session if user_id is in session
    if (isset($_SESSION['user_id'])) {
        $sessionManager->validateSession();
    }
}
?>