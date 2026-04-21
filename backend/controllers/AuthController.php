<?php
require_once __DIR__ . '/../models/User.php';

class AuthController {
    private $userModel;

    public function __construct($pdo) {
        $this->userModel = new User($pdo);
    }

    public function login($username, $password) {
        $username = trim((string) $username);
        $password = (string) $password;
        if ($username === '' || $password === '') {
            http_response_code(400);
            return ["error" => "Username and password are required"];
        }

        $adminUsername = getenv('ADMIN_USERNAME');
        $adminPassword = getenv('ADMIN_PASSWORD');

        if ($adminUsername && $username === $adminUsername) {
            if ($password !== $adminPassword) {
                http_response_code(401);
                return ["error" => "Invalid username or password"];
            }
            session_regenerate_id(true);
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

        session_regenerate_id(true);
        $_SESSION['username'] = $trainer['username'];
        $_SESSION['name']     = $trainer['name'];
        unset($_SESSION['is_admin']);

        return [
            "username" => $trainer['username'],
            "name"     => $trainer['name'],
            "balance"  => $trainer['balance']
        ];
    }

    public function register($username, $name, $password) {
        $username = trim((string) $username);
        $name = trim((string) $name);
        $password = (string) $password;
        if ($username === '' || $name === '' || $password === '') {
            http_response_code(400);
            return ["error" => "Username, name, and password are required"];
        }

        $registered = $this->userModel->register($username, $name, $password);
        if (!$registered) {
            if (http_response_code() === 200) {
                http_response_code(409);
                return ["error" => "Username already taken"];
            }
            return ["error" => "Registration failed"];
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
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool) $params['secure'], (bool) $params['httponly']);
        }
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
