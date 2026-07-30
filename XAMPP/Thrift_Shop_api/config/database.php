<?php
class Database {
    private static $instance = null;
    private $conn;

    private $host = "localhost";
    private $db_name = "mobile_migration";
    private $username = "root";
    private $password = "";

private function __construct() {
    try {
        

        $dsn = "mysql:host={$this->host};dbname={$this->db_name};charset=utf8mb4";
        $this->conn = new PDO($dsn, $this->username, $this->password);
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        error_log("Database connection failed: " . $e->getMessage());
        die("Could not connect to the database. Please try again later.");
    }
}


    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->conn;
    }

    private function __clone() {}

    public function __wakeup() {
        throw new Exception("Cannot unserialize a singleton.");
    }
}
