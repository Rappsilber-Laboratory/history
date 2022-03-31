<?php
    session_start();
    include('../../xiNET_website/php/utils.php');
    //you could comment out the following line and have no login authentication.
    ajaxBootOut();

    include('../../xiviewConfig.php');

    //open connection
    $dbconn = pg_connect($connectionString)
        or die('Could not connect: ' . pg_last_error());
    try {
        pg_query("BEGIN") or die("Could not start transaction\n");
        //error_log (print_r ($_SESSION, true));
        //error_log (print_r ($_POST, true));
        $upload_id = validateID_RandID($dbconn, $_POST["searchID"]);

        pg_prepare($dbconn, "getSearch", "UPDATE uploads SET deleted = true WHERE id = $1");
        $result = pg_execute($dbconn, "getSearch", [$upload_id]);
        //$row = pg_fetch_assoc ($result);

        pg_prepare($dbconn, "removeSeq", "DELETE FROM db_sequences WHERE upload_id = $1");
        $result = pg_execute($dbconn, "removeSeq", [$upload_id]);

        pg_prepare($dbconn, "removeMod", "DELETE FROM modifications WHERE upload_id = $1");
        $result = pg_execute($dbconn, "removeMod", [$upload_id]);

        pg_prepare($dbconn, "removePepEv", "DELETE FROM peptide_evidences WHERE upload_id = $1");
        $result = pg_execute($dbconn, "removePepEv", [$upload_id]);

        pg_prepare($dbconn, "removePep", "DELETE FROM peptides WHERE upload_id = $1");
        $result = pg_execute($dbconn, "removePep", [$upload_id]);

        pg_prepare($dbconn, "removeSpec", "DELETE FROM spectra WHERE upload_id = $1");
        $result = pg_execute($dbconn, "removeSpec", [$upload_id]);

        pg_prepare($dbconn, "removeSpecId", "DELETE FROM spectrum_identifications WHERE upload_id = $1");
        $result = pg_execute($dbconn, "removeSpecId", [$upload_id]);

        pg_query("COMMIT");
        echo json_encode(array("status"=>"success", "newHiddenState"=>true));
    } catch (Exception $e) {
        pg_query("ROLLBACK");
        echo(json_encode(array("status"=>"fail", "error"=> "An Error occurred when attempting to delete search id<br>".$_POST["searchID"])));
    }

    //close connection
    pg_close($dbconn);
