<?php
require_once __DIR__ . '/../models/User.php';

class AuthController {
    private $userModel;

    public function __construct($pdo) {
        $this->userModel = new User($pdo);
    }

    public function login($username, $password) {
        $adminUsername = getenv('ADMIN_USERNAME');
        $adminPassword = getenv('ADMIN_PASSWORD');

        if ($adminUsername && $username === $adminUsername) {
            if ($password !== $adminPassword) {
                http_response_code(401);
                return ["error" => "Invalid username or password"];
            }
            $_SESSION['username'] = $adminUsername;
            $_SESSION['name']     = 'Admin';
            $_SESSION['is_admin'] = true;
            return [
                "username" => $adminUsername,
                "name"     => "Admin",
                "balance"  => 0,
                "is_admin" => true
            ];
        }

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

    public function searchUsers($query) {
        return $this->userModel->search($query);
    }

    public function getProfile($username) {
        if (!$username) {
            http_response_code(400);
            return ["error" => "Username required"];
        }
        $trainer = $this->userModel->findByUsername($username);
        if (!$trainer) {
            http_response_code(404);
            return ["error" => "User not found"];
        }
        return [
            "username" => $trainer['username'],
            "name"     => $trainer['name']
        ];
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
        if (!empty($_SESSION['is_admin'])) {
            return [
                "username" => $_SESSION['username'],
                "name"     => "Admin",
                "balance"  => 0,
                "is_admin" => true
            ];
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
