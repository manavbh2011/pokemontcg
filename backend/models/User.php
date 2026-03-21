<?php
class User {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
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
