<?php
    session_start();
    include('../../xiNET_website/php/utils.php');
    //you could comment out the following line and have no login authentication.
    ajaxBootOut();

    include('../../xiviewConfig.php');
    //open connection
    try {
        // @ suppresses non-connection throwing an uncatchable error, so we can generate our own error to catch
        $dbconn = pg_connect($connectionString) or die('Could not connect: ' . pg_last_error());

        if ($dbconn) {
            //error_log (print_r ($_SESSION, true));
            //error_log (print_r ($_POST, true));

            $qPart1 = "SELECT * FROM upload WHERE user_id = $1 AND deleted IS NOT TRUE ORDER BY id DESC;";
            pg_prepare($dbconn, "my_query", $qPart1);
            $result = pg_execute($dbconn, "my_query", [$_SESSION['user_id']]);

            $data = pg_fetch_all($result);
            for ($d = 0; $d < count($data); $d++) {
                $item = $data[$d];
                if (!empty($item)){
                    // json decoding
                    $item["peak_list_file_names"] = json_decode($item["peak_list_file_names"]);
                    $item["analysis_software"] = json_decode($item["analysis_software"]);
                    $item["provider"] = json_decode($item["provider"]);
                    $item["audits"] = json_decode($item["audits"]);
                    $item["samples"] = json_decode($item["samples"]);
                    $item["analyses"] = json_decode($item["analyses"]);
                    $item["protocol"] = json_decode($item["protocol"]);
                    $item["bib"] = json_decode($item["bib"]);
                    $item["spectra_formats"] = json_decode($item["spectra_formats"]);
                    $item["upload_warnings"] = json_decode($item["upload_warnings"]);

                    // foreach($item as $var => $value) {
                    //     //echo "$var is $value\n";
                    //     $item[$var] = json_decode($value);
                    // }

                    //error_log("WTF?".json_encode($item, 4), 0);
                    // if ($item) {
                    //     for ($i = 0; $i < count($item); $i++) {
                            //error_log("WTF?".$item[0], 0);

                            //$temp = $item[$i];
                            //$item[$i] = json_decode($item[$i]);
                    //     }
                    // }

                    $data[$d] = $item;
                }
            }

            if ($data[0] == null) $data = [];

            echo json_encode(array("user"=>$_SESSION['session_name'], "data"=>$data));

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
        echo(json_encode(array("status"=>"fail", "error"=> "Error - ".$msg)));
    }
