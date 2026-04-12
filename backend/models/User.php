<?php
class User {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function register($username, $name, $password) {
        if ($this->findByUsername($username)) {
            return false;
        }
        $stmt = $this->pdo->prepare(
            "INSERT INTO trainer (username, name, password_hash, balance) VALUES (?, ?, ?, 10000)"
        );
        $stmt->execute([$username, $name, password_hash($password, PASSWORD_DEFAULT)]);
        $stmt->closeCursor();
        return true;
    }

    public function search($query) {
        $like = '%' . $query . '%';
        $stmt = $this->pdo->prepare(
            "SELECT username, name FROM trainer WHERE username LIKE ? OR name LIKE ? LIMIT 10"
        );
        $stmt->execute([$like, $like]);
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $stmt->closeCursor();
        return $result;
    }

    public function findByUsername($username) {
        $stmt = $this->pdo->prepare("SELECT * FROM trainer WHERE username = ?");
        $stmt->execute([$username]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $stmt->closeCursor();
        return $result;
    }

    public function deductBalance($username, $amount) {
        $stmt = $this->pdo->prepare(
            "UPDATE trainer SET balance = balance - ? WHERE username = ? AND balance >= ?"
        );
        $stmt->execute([$amount, $username, $amount]);
        $rows = $stmt->rowCount() > 0;
        $stmt->closeCursor();
        return $rows;
    }

    public function addBalance($username, $amount) {
        $stmt = $this->pdo->prepare("UPDATE trainer SET balance = balance + ? WHERE username = ?");
        $stmt->execute([$amount, $username]);
        $stmt->closeCursor();
    }
}
