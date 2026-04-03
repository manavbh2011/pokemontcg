<?php
require_once __DIR__ . '/../config/db.php';

$response = file_get_contents("https://api.tcgdex.net/v2/en/sets");

if ($response === false) {
    echo json_encode(["error" => "Failed to fetch sets from TCGdex API"]);
    exit;
}

$sets     = json_decode($response, true);
$inserted = 0;
$skipped  = 0;

foreach ($sets as $set) {
    $packTypeName = $set['name'];
    $description  = "Pack from the {$packTypeName} set.";

    $packTypeId = $set['id'];

    $check = $pdo->prepare("SELECT 1 FROM pack_type WHERE pack_type_id = ?");
    $check->execute([$packTypeId]);
    $exists = $check->fetchColumn();
    $check->closeCursor();

    if ($exists) {
        $skipped++;
        continue;
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            "INSERT INTO pack_type (pack_type_id, pack_type_name, pack_type_description, pack_price) VALUES (?, ?, ?, 0.00)"
        );
        $stmt->execute([$packTypeId, $packTypeName, $description]);
        $stmt->closeCursor();

        $stmt = $pdo->prepare("INSERT INTO pack (pack_type_name) VALUES (?)");
        $stmt->execute([$packTypeName]);
        $stmt->closeCursor();

        $pdo->commit();
        $inserted++;
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(["error" => "Failed on set '{$packTypeName}': " . $e->getMessage()]);
        exit;
    }
}

echo json_encode([
    "message"  => "Seeding complete",
    "inserted" => $inserted,
    "skipped"  => $skipped
]);
