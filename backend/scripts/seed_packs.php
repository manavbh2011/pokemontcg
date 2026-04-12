<?php
require_once __DIR__ . '/../config/db.php';

$response = file_get_contents("https://api.tcgdex.net/v2/en/sets");

if ($response === false) {
    echo json_encode(["error" => "Failed to fetch sets from TCGdex API"]);
    exit;
}

// Scan enough sets that some can be skipped (e.g. promotional with no card list) and we still get several types.
$sets = array_slice(json_decode($response, true), 0, 25);
$inserted = 0;
$skipped  = 0;

/** Price in coins per pack (was incorrectly seeded as 0.00 in older runs). */
$defaultPackPrice = 500.00;

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

    // Skip sets TCGdex lists with no pullable cards (e.g. some "W Promotional" entries).
    $detailResponse = @file_get_contents("https://api.tcgdex.net/v2/en/sets/{$packTypeId}");
    if ($detailResponse === false) {
        continue;
    }
    $detail = json_decode($detailResponse, true);
    if (empty($detail['cards'])) {
        continue;
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            "INSERT INTO pack_type (pack_type_id, pack_type_name, pack_type_description, pack_price) VALUES (?, ?, ?, ?)"
        );
        $stmt->execute([$packTypeId, $packTypeName, $description, $defaultPackPrice]);
        $stmt->closeCursor();

        // Pack instances are created on each purchase; no need to pre-insert a pack row.

        $pdo->commit();
        $inserted++;
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(["error" => "Failed on set '{$packTypeName}': " . $e->getMessage()]);
        exit;
    }
}

// Fix pack types that were inserted with 0.00 in older seed versions (no schema change).
$fixStmt = $pdo->prepare(
    "UPDATE pack_type SET pack_price = ? WHERE pack_price = 0 OR pack_price IS NULL"
);
$fixStmt->execute([$defaultPackPrice]);
$fixedRows = $fixStmt->rowCount();
$fixStmt->closeCursor();

echo json_encode([
    "message"           => "Seeding complete",
    "inserted"          => $inserted,
    "skipped"           => $skipped,
    "prices_fixed_rows" => $fixedRows
]);
