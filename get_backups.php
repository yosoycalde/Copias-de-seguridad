<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

include 'conec.php';

try {
    $db = new Database();
    $conn = $db->connect();
    
    // Obtener todas las copias ordenadas por fecha descendente
    $query = "SELECT categoria, item, fecha_copia 
              FROM copias_seguridad 
              ORDER BY fecha_copia DESC";
    
    $stmt = $conn->prepare($query);
    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Organizar los datos por categoría e item
    $backups = [
        'clasificados' => [
            'Edictos' => [],
            'Cristina' => [],
            'Homero' => [],
            'MP' => [],
            'Qhubo' => []
        ],
        'suscripciones' => [
            'Ana' => [],
            'Juliana' => []
        ]
    ];
    
    foreach ($results as $row) {
        $categoria = $row['categoria'];
        $item = $row['item'];
        $fecha = $row['fecha_copia'];
        
        // Formatear la fecha
        $timestamp = strtotime($fecha);
        $fechaFormateada = date('d/m/Y, H:i', $timestamp);
        
        if (isset($backups[$categoria][$item])) {
            $backups[$categoria][$item][] = $fechaFormateada;
        }
    }
    
    echo json_encode([
        'success' => true,
        'data' => $backups
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener las copias: ' . $e->getMessage()
    ]);
}
?>