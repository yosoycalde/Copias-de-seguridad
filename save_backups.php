<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

include 'conec.php';

try {
    // Obtener los datos del POST
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    if (!isset($data['items']) || !is_array($data['items'])) {
        throw new Exception('Datos inválidos');
    }
    
    $db = new Database();
    $conn = $db->connect();
    
    // Preparar la consulta
    $query = "INSERT INTO copias_seguridad (categoria, item, fecha_copia) 
              VALUES (:categoria, :item, :fecha_copia)";
    $stmt = $conn->prepare($query);
    
    $conn->beginTransaction();
    
    $insertCount = 0;
    foreach ($data['items'] as $backup) {
        if (!isset($backup['categoria']) || !isset($backup['item']) || !isset($backup['fecha'])) {
            continue;
        }
        
        // Convertir la fecha del formato español al formato MySQL
        // Formato entrada: "05/12/2024, 14:30"
        // Formato salida: "2024-12-05 14:30:00"
        $fechaParts = explode(', ', $backup['fecha']);
        $dateParts = explode('/', $fechaParts[0]);
        $timeParts = isset($fechaParts[1]) ? $fechaParts[1] : '00:00';
        
        $fechaMySQL = $dateParts[2] . '-' . $dateParts[1] . '-' . $dateParts[0] . ' ' . $timeParts . ':00';
        
        $stmt->bindParam(':categoria', $backup['categoria']);
        $stmt->bindParam(':item', $backup['item']);
        $stmt->bindParam(':fecha_copia', $fechaMySQL);
        
        if ($stmt->execute()) {
            $insertCount++;
        }
    }
    
    $conn->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Copias guardadas exitosamente',
        'count' => $insertCount
    ]);
    
} catch (Exception $e) {
    if (isset($conn)) {
        $conn->rollBack();
    }
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al guardar las copias: ' . $e->getMessage()
    ]);
}
?>