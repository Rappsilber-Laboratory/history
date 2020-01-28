<?php
	session_start();
    include('../../vendor/php/utils.php');
	//you could comment out the following line and have no login authentication. 
	ajaxBootOut();

	include('../../connectionString.php');
	//open connection
    try {
        // @ suppresses non-connection throwing an uncatchable error, so we can generate our own error to catch
        $dbconn = @pg_connect($connectionString);    //or die('Could not connect: ' . pg_last_error());

        if ($dbconn) {
            //error_log (print_r ($_SESSION, true));
            //error_log (print_r ($_POST, true));
            $searches = $_POST["searches"];
            $userRights = getUserRights ($dbconn, $_SESSION['user_id']);
            $superUser = $userRights["isSuperUser"];
            // decide if user can only see their own searches
            $showOthers = $userRights["canSeeAll"] && ($searches !== "MINE");
            $showFull = $superUser && $showOthers;  // all searches to be shown
            
			// figure out why epoch from now() isn't working here
            // Construct first part of query - load search data and 
            $qPart1 = "SELECT id, notes, user_name, submit_date, name, status, random_id, hidden, file_name, seq_name, enzyme, crosslinkers, is_executing, completed, miss_ping from

            (select search.id, search.completed, search.is_executing, search.hidden, search.notes, user_name as user_name, search.submit_date AS submit_date, 
			(search.ping is not NULL) and (extract (EPOCH FROM (NOW()::timestamp - search.ping)) > 30*60) AS miss_ping,
            search.name AS name, search.status AS status, search.random_id AS random_id,
           	string_agg(sequence_file.file_name,',') AS file_name, string_agg(left(sequence_file.name, -21),',') AS seq_name
            FROM search
            INNER JOIN users on search.uploadedby = users.id 
            INNER JOIN search_sequencedb on search.id = search_sequencedb.search_id
            INNER JOIN sequence_file on search_sequencedb.seqdb_id = sequence_file.id 
             "
            ;

            
            // Restriction Clauses
            
            // this sub-clause shows all searches apart from others' private searches and from hidden users
            $canSeeOthersPublicClause = "WHERE ((COALESCE (search.private, FALSE) = FALSE AND COALESCE (users.hidden, FALSE) = FALSE) OR search.uploadedby = $1) ";
            
            // whereas these sub-clauses restricts to a user's own searches
            $canSeeMineOnlyClause = "WHERE search.uploadedby = $1 ";
            $innerJoinMine = ($showOthers ? "" : "WHERE search.uploadedby = $1 ");
            
            // This sub-clause hides hidden searches
            $hideHiddenSearchesClause = " AND COALESCE (search.hidden, FALSE) = FALSE ";

            // Concatentate these clauses as necessary
            $privacyClause = $showFull ? "" : (($showOthers ? $canSeeOthersPublicClause : $canSeeMineOnlyClause).($superUser ? "" : $hideHiddenSearchesClause));
            
            
            // Next query part joins and retrieves enzyme and crosslinker names for each search
            $qPart3 = "
            GROUP BY search.id, user_name) srch

            inner join (select enzyme.name as enzyme, search.id as id2
                from search
                inner join parameter_set on parameter_set.id = search.paramset_id
                inner join enzyme on enzyme.id = parameter_set.enzyme_chosen "
                .$innerJoinMine.
            ") enz on enz.id2 = srch.id

            inner join (select string_agg(crosslinker.name,',') as crosslinkers, search.id as id3
                from search
                inner join chosen_crosslinker on chosen_crosslinker.paramset_id = search.paramset_id
                inner join crosslinker on crosslinker.id = chosen_crosslinker.crosslinker_id "
                .$innerJoinMine.
                "group by search.id
            ) xlinker on xlinker.id3 = srch.id

            ORDER BY (CASE WHEN status = 'queuing' THEN 0 WHEN is_executing THEN 1 ELSE 2 END) ASC, srch.id DESC ;
            ";
            
			
            $time_start = microtime (true);
            pg_prepare($dbconn, "my_query", $qPart1.$privacyClause.$qPart3);
            $result = pg_execute($dbconn, "my_query", $privacyClause ? [$_SESSION['user_id']] : []);
            $time_end = microtime(true);
            $time = $time_end - $time_start;

            $utilsLogout = file_exists ("../../util/logout.php");

            echo json_encode (array("user"=>$_SESSION['session_name'], "userRights"=>$userRights, "data"=>resultsAsArray($result), "utilsLogout"=>$utilsLogout, "time"=>$time));

            //close connection
            pg_close($dbconn);
        } else {
            throw new Exception ("Cannot connect to Database ☹");
        }
    }
    catch (Exception $e) {
        if ($dbconn) {
            pg_close ($dbconn);
        }
        $msg = $e->getMessage();
        echo (json_encode(array ("status"=>"fail", "error"=> "Error - ".$msg)));
    }
?>
