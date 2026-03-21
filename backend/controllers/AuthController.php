<?php
require_once __DIR__ . '/../models/User.php';

class AuthController {
    private $userModel;

    public function __construct($pdo) {
        $this->userModel = new User($pdo);
    }

    public function login($username, $password) {
        $trainer = $this->userModel->findByUsername($username);

        if (!$trainer || !password_verify($password, $trainer['password_hash'])) {
            http_response_code(401);
            return ["error" => "Invalid username or password"];
        }

        $_SESSION['username'] = $trainer['username'];
        $_SESSION['name']     = $trainer['name'];

        return [
            "username" => $trainer['username'],
            "name"     => $trainer['name'],
            "balance"  => $trainer['balance']
        ];
    }

    public function logout() {
        session_destroy();
        return ["message" => "Logged out"];
    }
}
