<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $titulo ?? 'Tienda en Línea'; ?></title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
    <link rel="stylesheet" href="recursos/css/estilos.css">
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-light bg-light">
        <div class="container">
            <a class="navbar-brand" href="index.php">
                <i class="bi bi-shop"></i> Tienda en Línea
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item">
                        <a class="nav-link" href="index.php">Inicio</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="carrito.php">Carrito <span id="cantidad-carrito" class="badge bg-danger">0</span></a>
                    </li>
                    <?php if (isset($_SESSION['cliente_id'])) { ?>
                        <li class="nav-item">
                            <a class="nav-link" href="mis-pedidos.php">Mis Pedidos</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="logout.php">Cerrar Sesión</a>
                        </li>
                    <?php } else { ?>
                        <li class="nav-item">
                            <a class="nav-link" href="login.php">Iniciar Sesión</a>
                        </li>
                    <?php } ?>
                </ul>
            </div>
        </div>
    </nav>