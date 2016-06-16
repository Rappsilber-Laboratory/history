<?php
	session_start();
	//you could comment out following 4 lines and have no login authentication. 
	if (!$_SESSION['session_name']) {
		header("location:login.html");
		exit;
	}
	include('../../connectionString.php');
	//open connection
	$dbconn = pg_connect($connectionString)
		or die('Could not connect: ' . pg_last_error());
		
error_log (print_r ($_POST, true));
	$searches = $_POST["searches"];
	
	if ($searches == "MINE"){
		pg_prepare($dbconn, "my_query",
		"SELECT search.id, search.notes, (array_agg(user_name))[1] as user_name, (array_agg(search.submit_date))[1] AS submit_date, (array_agg(search.name))[1] AS name, (array_agg(search.status))[1] AS status, (array_agg(search.random_id))[1] AS random_id, array_agg(sequence_file.file_name) AS file_name FROM search, users, search_sequencedb, sequence_file WHERE search.uploadedby = users.id AND search.id = search_sequencedb.search_id AND search_sequencedb.seqdb_id = sequence_file.id AND users.user_name = $1 AND status != 'hide' GROUP BY search.id ORDER BY (CASE WHEN status = 'queuing' THEN 0 WHEN is_executing THEN 1 ELSE 2 END) ASC, search.id DESC ;");
		$result = pg_execute($dbconn, "my_query", [$_SESSION['session_name']]);
	}
	else {
		$q = 
		"SELECT search.id, search.notes, (array_agg(user_name))[1] as user_name, (array_agg(search.submit_date))[1] AS submit_date, (array_agg(search.name))[1] AS name, (array_agg(search.status))[1] AS status, (array_agg(search.random_id))[1] AS random_id, array_agg(sequence_file.file_name) AS file_name FROM search, users, search_sequencedb, sequence_file WHERE search.uploadedby = users.id AND search.id = search_sequencedb.search_id AND search_sequencedb.seqdb_id = sequence_file.id AND status != 'hide' GROUP BY search.id ORDER BY (CASE WHEN status = 'queuing' THEN 0 WHEN is_executing THEN 1 ELSE 2 END) ASC, search.id DESC ;";	
		$result = pg_query($q) or die('Query failed: ' . pg_last_error());
	}

echo json_encode (pg_fetch_all($result));

	// Execute the prepared query
if (false) {
	while ($line = pg_fetch_array($result, null, PGSQL_ASSOC)) {
		$id = $line['id'];
		$urlPart = $id.'-'.$line['random_id'];
		
		$status = $line['status'];
		/*$statusSpacePos = strpos($status, ' ');
		if ($statusSpacePos > 0){
			$status = substr($line['status'], 0, $statusSpacePos);
		}*/
		$status = ' <strong>['.$status.']<strong>';
		
		echo "<tr><td><a id=".$line['name']." href='./network.php?sid=" . urlencode($urlPart) . "'>" . $line['name'] . "</a>" .$status. "</td>";
			
		echo "<td title='".$line['notes']."'>" .substr($line['notes'], 0, 16). "<div style='display:none'>".$line['notes']."</div></td>";

		$searchFile = $line['file_name'];
		

		//~ $status = $line['status'];
		//~ $statusSpacePos = strpos($status, ' ');
		//~ if ($statusSpacePos > 0){
			//~ $status = substr($line['status'], 0, $statusSpacePos);
		//~ }
		//~ echo "<td><strong>" .$status. "</strong></td>";

		echo "<td><a id='".$line['name']."' href='./validate.php?sid=" . urlencode($urlPart) . "'>validate</a>" . "</td>";
	

		echo "<td style='width:100px;'>" .$searchFile. "</td>";
		echo "<td>" .substr($line['submit_date'], 0, strpos($line['submit_date'], '.')) . "</td>";
		echo "<td>" .$id . "</td>";
		if ($searches == "MINE"){
			echo "<td></td>";
		} else {
			echo "<td>" .$line['user_name'] . "</td>";
		}
		//~ echo  "<td class='centre'><input type='checkbox' class='aggregateCheckbox' value='". $urlPart . "'></td>";
		echo  "<td class='centre'><input type='text' class='aggregateCheckbox' id='agg_". $urlPart . "' maxlength='1'></td>";
		echo "</tr>\n";
		
	}
}
?>
