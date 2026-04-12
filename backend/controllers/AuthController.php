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

    public function register($username, $name, $password) {
        $registered = $this->userModel->register($username, $name, $password);
        if (!$registered) {
            http_response_code(409);
            return ["error" => "Username already taken"];
        }
        return ["success" => true];
    }

    public function logout() {
        session_destroy();
        return ["message" => "Logged out"];
    }

    public function me() {
        if (!isset($_SESSION['username'])) {
            http_response_code(401);
            return ["error" => "Not logged in"];
        }
        $trainer = $this->userModel->findByUsername($_SESSION['username']);
        if (!$trainer) {
            http_response_code(404);
            return ["error" => "User not found"];
        }
        return [
            "username" => $trainer['username'],
            "name"     => $trainer['name'],
            "balance"  => $trainer['balance']
        ];
    }
}
