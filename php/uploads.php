<?php
session_start();
include('../../xiNET_website/php/utils.php');
//you could comment out the following line and have no login authentication.
ajaxBootOut();

include('../../xiviewConfig.php');
//open connection
try {
    // @ suppresses non-connection throwing an uncatchable error, so we can generate our own error to catch
    /** @noinspection PhpUndefinedVariableInspection */
    $dbconn = pg_connect($connectionString) or die('Could not connect: ' . pg_last_error());

    /** @noinspection PhpConditionAlreadyCheckedInspection */
    if ($dbconn) {
        $qPart1 = "SELECT id, identification_file_name, TO_CHAR (upload_time, 'YYYY/MM/DD___HH24:MI' ) AS upload_time, upload_error, upload_warnings, random_id FROM upload WHERE user_id = $1 AND deleted IS NOT TRUE ORDER BY id DESC;";
        pg_prepare($dbconn, "my_query", $qPart1);
        $result = pg_execute($dbconn, "my_query", [$_SESSION['user_id']]);
        $data = pg_fetch_all($result);
        for ($d = 0; $d < count($data); $d++) {
            $item = $data[$d];
//            $item["upload_warnings"] = json_decode($item["upload_warnings"]);
            if (!empty($item)) {
                foreach ($item as $var => $value) {
                    //echo "$var is $value\n";
                    $decoded = json_decode($value);
                    if ($decoded !== null) $item[$var] = $decoded;
                }
                $data[$d] = $item;
            }
        }
        if ($data[0] == null) $data = [];
        echo json_encode(array("user" => $_SESSION['session_name'], "data" => $data));
        //close connection
        pg_close($dbconn);
    } else {
        throw new Exception("Cannot connect to Database ☹");
    }
} catch (Exception $e) {
    if ($dbconn) {
        pg_close($dbconn);
    }
    $msg = $e->getMessage();
    echo(json_encode(array("status" => "fail", "error" => "Error - " . $msg)));
}
