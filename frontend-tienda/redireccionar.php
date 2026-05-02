<?php

// Redireccionar según el rol del usuario
session_start();

if (! isset($_SESSION['usuario'])) {
    header('Location: ../login.html');
    exit;
}

$usuario = $_SESSION['usuario'];

if ($usuario['rol'] == 1) {
    header('Location: ../admin/index.html');
} else {
    header('Location: ../cliente/index.html');
}
exit;
