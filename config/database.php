<?php
// Database Configuration

require_once __DIR__ . '/config.php';

class Database {
    private $host = 'localhost';
    private $db_name = 'exam_portal';
    private $username = 'root';
    private $password = '';
    private $charset = 'utf8mb4';
    private $conn;

    public function getConnection() {
        $this->conn = null;

        try {
            $dsn = "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=" . $this->charset;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_PERSISTENT => true
            ];

            $this->conn = new PDO($dsn, $this->username, $this->password, $options);

        } catch(PDOException $exception) {
            if (DEBUG_MODE) {
                echo "Connection error: " . $exception->getMessage();
            } else {
                echo "Database connection failed. Please try again later.";
            }
            exit();
        }

        return $this->conn;
    }

    public function testConnection() {
        try {
            $conn = $this->getConnection();
            return $conn ? true : false;
        } catch (Exception $e) {
            return false;
        }
    }

    public function executeQuery($query, $params = []) {
        try {
            $conn = $this->getConnection();
            $stmt = $conn->prepare($query);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            if (DEBUG_MODE) {
                error_log("Database Error: " . $e->getMessage());
            }
            throw new Exception("Database operation failed");
        }
    }

    public function fetchAll($query, $params = []) {
        $stmt = $this->executeQuery($query, $params);
        return $stmt->fetchAll();
    }

    public function fetchOne($query, $params = []) {
        $stmt = $this->executeQuery($query, $params);
        return $stmt->fetch();
    }

    public function insert($table, $data) {
        $columns = implode(', ', array_keys($data));
        $placeholders = implode(', ', array_fill(0, count($data), '?'));
        $values = array_values($data);

        $query = "INSERT INTO $table ($columns) VALUES ($placeholders)";

        try {
            $conn = $this->getConnection();
            $stmt = $conn->prepare($query);
            $stmt->execute($values);
            return $conn->lastInsertId();
        } catch (PDOException $e) {
            if (DEBUG_MODE) {
                error_log("Insert Error: " . $e->getMessage());
            }
            throw new Exception("Failed to insert data");
        }
    }

    public function update($table, $data, $where, $whereParams = []) {
        $setClauses = [];
        $params = [];

        foreach ($data as $column => $value) {
            $setClauses[] = "$column = ?";
            $params[] = $value;
        }

        $setClause = implode(', ', $setClauses);
        $params = array_merge($params, $whereParams);

        $query = "UPDATE $table SET $setClause WHERE $where";

        try {
            $conn = $this->getConnection();
            $stmt = $conn->prepare($query);
            return $stmt->execute($params);
        } catch (PDOException $e) {
            if (DEBUG_MODE) {
                error_log("Update Error: " . $e->getMessage());
            }
            throw new Exception("Failed to update data");
        }
    }

    public function delete($table, $where, $params = []) {
        $query = "DELETE FROM $table WHERE $where";

        try {
            $conn = $this->getConnection();
            $stmt = $conn->prepare($query);
            return $stmt->execute($params);
        } catch (PDOException $e) {
            if (DEBUG_MODE) {
                error_log("Delete Error: " . $e->getMessage());
            }
            throw new Exception("Failed to delete data");
        }
    }

    public function beginTransaction() {
        $conn = $this->getConnection();
        return $conn->beginTransaction();
    }

    public function commit() {
        $conn = $this->getConnection();
        return $conn->commit();
    }

    public function rollback() {
        $conn = $this->getConnection();
        return $conn->rollback();
    }
}

// Create database instance
$database = new Database();
?>