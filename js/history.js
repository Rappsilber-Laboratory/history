/*jslint browser: true, white: true, stupid: true, vars: true*/
var CLMSUI = CLMSUI || {};
  
/**
 * Javascript code for constructing a paged table of xi search results
 * from a returned database query.
 * @version 1.0
 * @namespace CLMSUI.history
 */
CLMSUI.history = {

    /**
     * Make a reachable xi URL from a search id and parameters
     * @param sid - xi searchID
     * @param params - extra parameters for URL query string such as decoys and lowestScore
     */
    makeResultsUrl: function (sid, params) {
        return "../xi3/network.php?sid="+sid+params;
    },

    
    defaultValues: {
        visibility: {
            "Visualise Search": true,
            "+FDR": true,
            "Restart": false,
            "Notes": true,
            "Validate": true,
            "Sequence": true,
            "Enzyme": false,
            "Cross-Linkers": false,
            "Submit Date": true,
            "ID": true,
            "Base New": false,
            "User": true,
            "Agg Group": true,
            "Delete": true,
        },
        filters: {},
        searchScope: "mySearches",
        sort: {
            column: null,
            sortDesc: null
        },
    },

    tempValues: {},	// store user values temporarily, in case they decide to 'keep' later on

    /**
     * Get initial values by merging defaults with values fetched from localStorage
     */
    getInitialValues: function () {
        var cookieValues = this.getCookieValue() || {};
        //console.log ("cookieValues", cookieValues);
        var currentRadio = d3.select("#scopeOptions").selectAll("input[type='radio']")
            .filter (function () {
                return d3.select(this).property("checked");
            })
        ;
        // cookieValues overwrites currentRadio which overwites initialValues
        return $.extend ({}, this.defaultValues, {searchScope: currentRadio.size() === 1 ? currentRadio.attr("id") : undefined}, cookieValues);
    },

    /**
    * Initialise search scope choice controls
    */
    init: function () {
        var self = this;
        d3.select("#scopeOptions").selectAll("input[type='radio']")
            .on ("change", function () {
                self.updateCookie ("searchScope", d3.select(this).attr("id"));
                self.loadSearchList();
            })
        ;

        var initialValues = this.getInitialValues();	// get default / cookie values
        this.tempValues = initialValues;
        d3.select("#"+initialValues.searchScope).property("checked", true);

        if (!CLMSUI.history.canLocalStorage) {
            d3.select("#rememberOption").style("display", "none");
        }
        d3.select("#rememberOption input[type='checkbox']").property("checked", this.youMayRememberMe());
    },


    /**
    *   Load the search list from the database with an ajax call to php
    */
    loadSearchList: function () {
         var initialValues = this.getInitialValues();	// get default / cookie values

        d3.selectAll(".d3tableContainer").remove();
           d3.selectAll("button").classed("btn btn-1 btn-1a", true);

        var self = this;

        // Column settings for d3table
        var columnSettings = {
            name: {columnName: "Visualise Search", type: "alpha", headerTooltip: "", visible: true, removable: true},
            fdr: {columnName: "+FDR", type: "none", headerTooltip: "Visualise search with decoys to allow False Discovery Rate calculations", visible: true, removable: true},
            restart: {columnName: "Restart", type: "none", headerTooltip: "", visible: false, removable: true},
            notes: {columnName: "Notes", type: "alpha", headerTooltip: "", visible: true, removable: true},
            validate: {columnName: "Validate", type: "none", headerTooltip: "", visible: true, removable: true},
            file_name: {columnName: "Sequence", type: "alpha", headerTooltip: "", visible: true, removable: true},
            enzyme: {columnName: "Enzyme", type: "alpha", headerTooltip: "", visible: false, removable: true},
            crosslinkers: {columnName: "Cross-Linkers", type: "alpha", headerTooltip: "", visible: false, removable: true},
            base_new: {columnName: "Base New", type: "none", headerTooltip: "Base a New Search's parameters on this Search", visible: false, removable: true},
            submit_date: {columnName: "Submit Date", type: "alpha", headerTooltip: "", visible: true, removable: true},
            id: {columnName: "ID", type: "alpha", headerTooltip: "", visible: true, removable: true},
            user_name: {columnName: "User", type: "alpha", headerTooltip: "", visible: true, removable: true},
            aggregate: {columnName: "Agg Group", type: "clearCheckboxes", headerTooltip: "Assign numbers to searches to make groups within an aggregated search", visible: true, removable: false},
            //delete: {name: "Delete", type: "deleteHiddenSearchesOption", tooltip: "", visible: true, removable: true},
            hidden: {columnName: "Delete", type: "boolean", headerTooltip: "", visible: true, removable: true},
        };

        // Set visibilities of columns according to cookies or default values
        d3.entries(columnSettings).forEach (function (columnEntry) {
            columnEntry.value.visible = initialValues.visibility[columnEntry.value.columnName];
        }, this);


        var pluck = function (data, prop) {
            return data.map (function (d) { return d[prop]; });
        };


        var userOnly = initialValues.searchScope === "mySearches";
        var params = userOnly ? "searches=MINE" : "searches=ALL";

        // Set up and launch loading spinner
        if (d3.select(".container #clmsErrorBox").empty()) {
            d3.select(".container")
                .append("div")
                .attr ("id", "clmsErrorBox")
                    .append("div")
                    .attr("class", "spinGap")
            ;
        }
        d3.select(".container #clmsErrorBox")
            .style("display", null)
            .select ("div.spinGap")
                .text("Loading Search Metadata from Xi Database.")
        ;
        var spinner = new Spinner({scale: 1, left: 12}).spin (d3.select("#clmsErrorBox").node());


        var t1 = performance.now();
    
        // Load data from searches.php
       $.ajax({
            type:"POST",
            url:"./php/searches.php",
            data: params,
            contentType: "application/x-www-form-urlencoded",
            dataType: 'json',
            success: function(response, responseType, xmlhttp) {
                var t2 = performance.now();
                console.log ("STOP AJAX +", t2-t1, "DB", response.time, "I/O", ((t2-t1)/1000) - response.time);
                spinner.stop();

                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                    //console.log ("response", response, responseType);
                    if (response.redirect) {
                        window.location.replace (response.redirect);
                    }
                    else if (response.status === "fail") {
                        d3.select("#clmsErrorBox").text(response.error || "Database Error");
                        console.log ("response error", response);
                    }
                    else {
                         // This is a catch until new usergui is rolled out */
                        if (response.utilsLogout) {
                            d3.select("#logout")
                                .attr ("onclick", null)
                                .on ("click", function () {
                                    window.location.replace ("../../util/logout.php");
                                })
                            ;
                        }

                        d3.select("#aggSearch").on ("click", function () {
                            self.aggregate (response.data, false);
                        });
                        d3.select("#aggFDRSearch").on ("click", function () {
                            self.aggregate (response.data, true);
                        });

                        var userHasRights = function (type) {
                            return response.userRights && response.userRights[type];
                        };

                        // Add further menu buttons depending on user rights (called php always checks so secure)
                        d3.select("#username").text(response.user);
                        d3.selectAll("#newSearch").style("display", userHasRights ("canAddNewSearch") ? null : "none");
                        d3.selectAll("#userGUI,#logout").style("display", userHasRights ("doesUserGUIExist") ? null : "none");
                        d3.selectAll("#scopeOptions").style("display", userHasRights ("canSeeAll") ? null : "none");

                        /**
                        *   Make a hyperlink HTML string for a given search and parameters
                        *   @function makeResultsLink
                        *   @inner
                        *   @memberof CLMSUI.history
                        *   @param sid - search id
                        *   @param params - additional url query parameters
                        *   @param label - text label for hyperlink element
                        *   @returns {string} HTML snippet
                        */
                        var makeResultsLink = function (sid, params, label) {
                             return "<a href='"+CLMSUI.history.makeResultsUrl(sid, params)+"'>"+label+"</a>";
                        };

                        /**
                        *   Make a validation URL for a given search and paramters
                        *   @function makeValidationURL
                        *   @inner
                        *   @memberof CLMSUI.history
                        *   @param sid - search id
                        *   @param params - additional url query parameters
                        *   @returns {string} Validation URL as string
                        */
                        var makeValidationUrl = function (sid, params) {
                             return "../xi3/validate.php?sid="+sid+params;
                        };

                        /**
                        *   Make a hyperlink HTML string for the search submit page based on a search id
                        *   @function makeBaseNewLink
                        *   @inner
                        *   @memberof CLMSUI.history
                        *   @param d - Object (d3 data element). id and random_id properties hold the relevant search data
                        *   @param label - text label for hyperlink element
                        *   @returns {string} HTML snippet
                        */
                        var makeBaseNewLink = function (d, label) {
                             return "<a href='../../searchSubmit/submitSearch.html?base="+d.id+"-"+d.random_id+"'>"+label+"</a>";
                        };

                        var isTruthy = function (val) {
                            return val === true || val === "t" || val === "true";
                        };

                        var tooltipHelper = function (d, field) {
                            return d.value.id + ": " + d.value[field];
                        }
                        // tooltips for columns
                        var tooltips = {
                            notes: function(d) { return tooltipHelper (d, "notes"); },
                            name: function(d) { return tooltipHelper (d, "status"); },
                            file_name: function(d) { return tooltipHelper (d, "file_name"); },
                            //file_name: function(d) { return d.value.id + ": " + modifiers.file_name(d.value); },
                            enzyme: function(d) { return tooltipHelper (d, "enzyme"); },
                            crosslinkers: function(d) { return tooltipHelper (d, "crosslinkers"); },
                        };

                        // cell stylings for columns
                        var cellStyles = {
                            name: "varWidthCell",
                            file_name: "varWidthCell2",
                        };

                        var cellHeaderOnlyStyles = {
                            fdr: "dottedBorder",
                        };

                        var cellWidths = {
                            //name: "20em",
                            notes: "8em",
                            fdr: "3.5em",
                            restart: "5em",
                            validate: "5em",
                            //file_name: "15em",
                            submit_date: "10em",
                            id: "4em",
                            enzyme: "5em",
                            crosslinkers: "8.5em",
                            base_new: "5.5em",
                            user_name: "5.5em",
                            aggregate: "5.5em",
                            hidden: "5.5em",
                        };

                        var isErrorMsg = function (msg) {
                            return (msg.substr(0,4) === "XiDB" || msg.substr(0,10) === "UNFINISHED");
                        };

                        // These modifiers are used by d3table to change the output from simple text fields
                        // i.e. to make hyperlinks and buttons and add extra information
                        // 'd' holds the data for an entire row (across all columns)
                        var modifiers = {
                            name: function(d) {
                                var completed = d.status === "completed";
                                var name = d.name.length < 200 ? d.name : (d.name.substring (0, 200) + "…");
                                var nameHtml = completed ? makeResultsLink (d.id+"-"+d.random_id, "", name)
                                    : "<span class='unviewableSearch'>"+name+"</span>"
                                ;
                                var error = !completed && isErrorMsg (d.status);
                                return nameHtml + (error ? "<span class='xierror'>" : "") + " ["+d.status.substring(0,16)+"]" + (error ? "</span>" : "") /*+
                                    (d.status.length <= 16 ? "" : "<div style='display:none'>"+d.status+"</div>")*/;
                            },
                            fdr: function (d) {
                                var unuseable = isErrorMsg (d.status) || d.status !== "completed";
                                return unuseable ? "" : makeResultsLink (d.id+"-"+d.random_id, "&decoys=1&unval=1", "+FDR");
                            },
                            restart: function(d) {
                                // add restart button for user if search executing, not completed and hasn't pinged in a while
                                // let user use judgement
                                return (d.user_name === response.user || response.userRights.isSuperUser) && (/*isTruthy(d.is_executing) &&*/ !isTruthy(d.completed) && isTruthy(d.miss_ping)) ? "<button class='restartButton unpadButton'>Restart</button>" : "";
                            },
                            notes: function (d) {
                                // Let fixed column width take care of only showing the first few characters
                                return d.notes; // ? d.notes.substring(0,16)+"<div style='display:none'>"+d.notes+"</div>" : "";
                            },
                            validate: function () {
                                return "<span class='validateButton fauxLink'>Validate</span>";
                            },
                            file_name: function (d) {
                                return d.file_name;
                            },
                            enzyme: function (d) { return d.enzyme; },
                            crosslinkers: function (d) { return d.crosslinkers; },
                            base_new: function (d) {
                                return makeBaseNewLink (d, "Base New");
                            },
                            submit_date: function(d) {
                                return d.submit_date.substring(0, d.submit_date.indexOf("."));
                            },
                            id: function(d) { return d.id; },
                            user_name: function(d) { return d.user_name; },
                            aggregate: function(d) {
                                var completed = d.status === "completed";
                                return completed ? "<input type='number' pattern='\\d*' class='aggregateInput' id='agg_"+d.id+"-"+d.random_id+"' maxlength='2' min='1' max='99'"+(d.aggregate ? " value='"+d.aggregate+"'" : "") + ">" : "";
                            },
                            hidden: function(d) {
                                return d.user_name === response.user || response.userRights.isSuperUser ? "<button class='deleteButton unpadButton'>"+(isTruthy(d.hidden) ? "Restore" : "Delete")+"</button>" : "";
                            }
                        };

                        // Make a columnSettings object for d3table using the above info
                        var propertyNames = ["cellStyle", "dataToHTMLModifier", "tooltip"];
                        [cellStyles, modifiers, tooltips].forEach (function (obj, i) {
                            var propName = propertyNames[i];
                            d3.entries(obj).forEach (function (entry) {
                                columnSettings[entry.key][propName] = entry.value;
                            });
                        });


                        d3.select("#clmsErrorBox").style("display", response.data ? "none" : null);    // hide no searches message box if data is returned
                        if (!response.data) {
                             d3.select("#clmsErrorBox").text ("You Currently Have No Searches in the Xi Database.");
                        }

                        //console.log ("rights", response.userRights);
                        //console.log ("data", response.data);

                        /**
                        *   Sanitise data in place, get rid of html, comment characters that could be exploited
                        *   @function sanitise
                        *   @inner
                        *   @memberof CLMSUI.history
                        *   @param data - all returned search data from ajax
                        */
                        var sanitise = function (data) {
                            var escapeHtml = function (html) {
                                var fn = function(tag) {
                                    var charsToReplace = {
                                        '&': '&amp;',
                                        '<': '&lt;',
                                        '>': '&gt;',
                                        '"': '&#34;',
                                    };
                                    return charsToReplace[tag] || tag;
                                };
                                return html ? html.replace(/[&<>"]/g, fn) : html;
                            };

                            if (data.length) {
                                var keys = d3.set (d3.keys (data[0]));
                                ["id", "submit_date", "status", "random_id"].forEach (function (notkey) {
                                    keys.remove (notkey);   // database generated fields so not an issue
                                });
                                keys = keys.values();
                                //console.log ("keys", keys);
                                data.forEach (function (row) {
                                    for (var k = 0; k < keys.length; k++) {
                                        var kk = keys[k];
                                        row[kk] = escapeHtml (row[kk]);
                                    }
                                });
                            }
                        };

                        // Show a search's sequence name in the file name string if different from raw file name
                        var preformatData = function (data) {
                            if (data.length) {
                                data.forEach (function (d) {
                                    var snlength = d.seq_name.length;
                                    d.file_name = (snlength > d.file_name.length || d.file_name.substr(0, snlength) !== d.seq_name) ? d.seq_name+" ("+d.file_name+")" : d.file_name;
                                });
                            }
                        };

                        //var a = performance.now();
                        sanitise (response.data);
                        preformatData (response.data);  // update data with some pre-conditions / formatting
                        //var b = performance.now() - a;
                        //console.log ("sanity in", b, "ms.");

                        /* Everything up to this point helps generates the dynamic table */


                        if (userOnly) {
                            columnSettings.user_name.visible = false;
                        }

                        // not used (and not linked to any deadly php functions so dont worry)
                        var setupFinalDeletionDialog = function (response) {
                            var dialog = CLMSUI.jqdialogs.choicesDialog (
                                "popChoiceDialog",
                                response.deadSearches+" Searches marked for deletion."
                                +"<br>"+response.acqFilesizes.length+" associated Acqusition files."
                                +"<br>"+response.seqFilesizes.length+" associated Sequence files."
                                +"<br><br>Deletion actions below may take several minutes.",
                                "⚠ Search Deletion",
                                ["⚠ Delete These Searches", "⚠ Delete These Searches and Files"],
                                [{}, {deleteFiles: true}],
                                function (postOptions) {
                                    var waitDialogID = "databaseLoading";
                                    CLMSUI.jqdialogs.waitDialog (waitDialogID, "This will take a while...", "Deleting Searches");
                                    /*
                                     $.ajax({
                                        type: "POST",
                                        url:"./php/queryDeletedSearches.php",
                                        data: postOptions || {},
                                        dataType: 'json',
                                        success: function (response, responseType, xmlhttp) {
                                            console.log ("lol", response);
                                            CLMSUI.jqdialogs.killWaitDialog (waitDialogID);
                                            CLMSUI.history.loadSearchList();
                                        },
                                     });
                                     */
                                    // testing dialogs
                                    setTimeout (function() {
                                        CLMSUI.jqdialogs.killWaitDialog (waitDialogID);
                                        CLMSUI.history.loadSearchList();
                                    }, 3000);
                                    return true;
                                }
                            );
                        };

                        /**
                        *   Add button to clear aggregation checkboxes which calls history.clearAggregationInputs
                        *   @function addClearAggInputsButton
                        *   @inner
                        *   @memberof CLMSUI.history
                        *   @param buttonContainer - parent container for this button
                        *   @param d3RowFunc - function that gives access to every row in d3table
                        *   @param data - underlying d3table data
                        */
                        function addClearAggInputsButton (buttonContainer, d3rowFunc, data) {
                            buttonContainer
                                .append("button")
                                .text ("Clear ↓")
                                .attr ("class", "btn btn-1 btn-1a clearChx")
                                .attr ("title", "Clear all aggregation group values")
                                .on ("click", function () {
                                    CLMSUI.history.clearAggregationInputs (data, d3rowFunc());
                                })
                            ;
                        }

                        /**
                        *   Store column hiding settings in localStorage if permitted
                        *   @function storeColumnHiding
                        *   @inner
                        *   @memberof CLMSUI.history
                        *   @param column - column name to hide or show
                        *   @param checked - true (show) or false (hide)
                        */
                        function storeColumnHiding (column, checked) {
                            var visibilities = self.getCookieValue("visibility");
                            if (visibilities) {
                                visibilities[column] = checked;
                                self.updateCookie ("visibility", visibilities);
                            }
                        }

                        /**
                        *   Store current column ordering in localStorage if permitted
                        *   @function storeOrdering
                        *   @inner
                        *   @memberof CLMSUI.history
                        *   @param sortColumn - name of column to sort on
                        *   @param sortDesc - sort is ascending (false) or descending (true)
                        */
                        function storeOrdering (sortColumn, sortDesc) {
                            var sort = self.getCookieValue("sort");
                            if (sort) {
                                sort.column = sortColumn;
                                sort.sortDesc = sortDesc;
                                self.updateCookie ("sort", sort);
                            }
                        }

                        /**
                        *   Store current column filters in localStorage if permitted
                        *   @function storeFiltering
                        *   @inner
                        *   @memberof CLMSUI.history
                        *   @param filterVals - column indexed array of objects with filter as value property in each
                        */
                        function storeFiltering (filterVals) {
                            var filters = self.getCookieValue("filters");
                            if (filters) {
                                var fobj = {};
                                filterVals.forEach (function (df, i) {
                                    if (df !== "none" && df.value) {
                                        fobj[i] = df.value;
                                    }
                                });
                                self.updateCookie ("filters", fobj);
                            }
                        }


                        /**
                        *   Add a multiple select widget (multiple-select.js) for column visibility
                        *   @function addColumnSelector
                        *   @inner
                        *   @memberof CLMSUI.history
                        *   @param containerSelector - parent element as a d3 selection
                        *   @param d3table - d3table instance
                        *   @param dispatch - d3 event dispatch object
                        */
                        function addColumnSelector (containerSelector, d3table, dispatch) {
                            var newtd = containerSelector;
                            newtd.append("span").text("Show Columns");
                            var datum = newtd.datum();
                            var removableColumns = d3.entries(datum).filter (function (d) {
                                return d.value.removable;
                            });
                            newtd.append("select")
                                .property("multiple", true)
                                .selectAll("option")
                                .data(removableColumns, function(d) {return d.key; })
                                    .enter()
                                    .append("option")
                                    .text (function(d) { return d.value.columnName; })
                                    .property ("value", function(d) { return d.key; })
                                    .property ("selected", function (d) { return d.value.visible; })
                            ;
                            $(newtd.select("select").node()).multipleSelect ({
                                selectAll: false,
                                onClick: function (view) {
                                    // hide/show column chosen by user
                                    var key = view.value;
                                    datum[key].visible = view.checked;
                                    d3table.showColumn (d3table.getColumnIndex(key) + 1, view.checked);
                                    dispatch.columnHiding (view.label, view.checked);
                                }
                            });

                            newtd.select("button.ms-choice").attr("title", "Check 'Keep Settings' to remember these choices.");

                            newtd.append("span").attr("class", "dividerSection");
                        }

                        /**
                        *   Add a span to hold the number of current searches in the table
                        *   @function addFilterReporter
                        *   @inner
                        *   @memberof CLMSUI.history
                        *   @param containerSelector - parent element as a d3 selection
                        *   @param d3table - d3table instance
                        */
                        function addFilterReporter (containerSelector, d3table) {
                            var freporter = containerSelector.append("span")
                                .attr("class", "filterReporter dividerSection")
                                .attr ("title", "Number of searches that satisfy table filters")
                            ;
                        }
                        
                        /**
                        *   Add a span to cancel the current column sort on the d3table
                        *   @function addCancelSort
                        *   @inner
                        *   @memberof CLMSUI.history
                        *   @param containerSelector - parent element as a d3 selection
                        *   @param d3table - d3table instance
                        */
                        function addCancelSort (containerSelector, d3table) {
                            var sortCanceller = containerSelector.append("button")
                                .attr ("class", "btn btn-1 btn-1a darkBackground")
                                .attr ("title", "Revert table to database sort ordering")
                                .text ("Cancel Sort")
                                .on ("click", function () {
                                    storeOrdering (null, null);
                                    d3table
                                        .orderKey (null)
                                        .orderDir (null)
                                        .refilter()
                                        .update()
                                    ;
                                })
                            ;
                        }


                        /**
                        *   Apply cell styling to d3table headers
                        *   @function applyHeaderStyling
                        *   @inner
                        *   @memberof CLMSUI.history
                        *   @param headers - d3 selection of d3 table header cells
                        */
                        function applyHeaderStyling (headers) {
                            var title = headers.select("svg").select("title");
                            if (title.empty()) {
                                title = headers.select("svg").append("title");
                            }
                            title.text(function(d) { return "Sort table by "+columnSettings[d.key].columnName; });

                            headers
                                .filter (function(d) { return cellStyles[d.key]; })
                                .each (function(d) {
                                    d3.select(this).classed (cellStyles[d.key], true);
                                })
                            ;
                            headers
                                .filter (function(d) { return cellHeaderOnlyStyles[d.key]; })
                                .each (function(d) {
                                    d3.select(this).classed (cellHeaderOnlyStyles[d.key], true);
                                })
                            ;
                            headers
                                .filter (function(d) { return cellWidths[d.key]; })
                                .each (function(d) {
                                    d3.select(this).style("width", cellWidths[d.key]);
                                })
                            ;
                        }


                        /**
                        *   Update visual row state according to hidden property of underlying data object.
                        *   Resets hide button text and row appearance.
                        *   @function updateHiddenRowStates
                        *   @inner
                        *   @memberof CLMSUI.history
                        *   @param selectedRows - d3 selection of table (tr) rows
                        */
                        function updateHiddenRowStates (selectedRows) {
                            selectedRows.selectAll(".deleteButton").text (function(d) {
                                return isTruthy(d.hidden) ? "Restore" : "Delete";
                            });
                            selectedRows.classed ("hiddenSearch", function(d) { return isTruthy(d.hidden); });
                        }

                        /**
                        *   Add delete search functionality to buttons / links in table
                        *   @function addDeleteButtonFunctionality
                        *   @inner
                        *   @memberof CLMSUI.history
                        *   @param selection - d3 selection of a table row (tr)
                        */
                        var addDeleteButtonFunctionality = function (selection) {
                            selection.select("button.deleteButton")
                                .classed("btn btn-1 btn-1a", true)
                                .on ("click", function(d) {
                                    //console.log ("d", d);

                                    // Post deletion/restoration code
                                    var deleteRowVisibly = function (d) {
                                        // delete row from table somehow
                                        var thisID = d.id;
                                        var selRows = d3.selectAll("tbody tr").filter(function(d) { return d.id === thisID; });
                                        // if superuser change state of delete/restore button otherwise remove row from view
                                        if (response.userRights.isSuperUser) {
                                            updateHiddenRowStates (selRows);
                                        } else {
                                            var index = pluck(response.data, "id").indexOf(d.id);
                                            if (index >= 0) {
                                                response.data.splice (index, 1);
                                                d3table.filter(d3table.filter()).update();
                                            }
                                        }
                                    };
                                    //deleteRowVisibly (d); // alternative to following code for testing without doing database delete

                                    // Ajax delete/restore call
                                     var doDelete = function() {
                                        $.ajax({
                                            type: "POST",
                                            url:"./php/deleteSearch.php",
                                            data: {searchID: d.id, setHiddenState: !isTruthy(d.hidden)},
                                            dataType: 'json',
                                            success: function (response, responseType, xmlhttp) {
                                                if (response.status === "success") {
                                                    console.log ("response", response);
                                                    d.hidden = response.newHiddenState;
                                                    deleteRowVisibly (d);
                                                }
                                            }
                                        });
                                    };

                                    var basicMsg = (isTruthy(d.hidden) ? "Restore" : "Delete") + " Search "+d.id+"?";
                                    var msg = isTruthy(d.hidden) ?
                                        (response.userRights.isSuperUser ? basicMsg : "You don't have permission for this action") :
                                        (response.userRights.isSuperUser ? basicMsg+"<br>(As a superuser you can restore this search later)" : basicMsg+"<br>This action cannot be undone (by yourself).<br>Are You Sure?")
                                    ;

                                    // Dialog
                                    CLMSUI.jqdialogs.areYouSureDialog (
                                        "popChoiceDialog",
                                        msg,
                                        "Please Confirm", "Yes, "+(isTruthy(d.hidden) ? "Restore" : "Delete") + " this Search", "No, Cancel this Action",
                                        doDelete
                                    );
                                })
                            ;
                        };


                        /**
                        *   Add restart search functionality to buttons / links in table
                        *   @function addRestartButtonFunctionality
                        *   @inner
                        *   @memberof CLMSUI.history
                        *   @param selection - d3 selection of a table row (tr)
                        */
                        var addRestartButtonFunctionality = function (selection) {
                            selection.select("button.restartButton")
                                .classed("btn btn-1 btn-1a", true)
                                .on ("click", function(d) {
                                    // Post restart code
                                    var updateCurrentRow = function (currentData, newData) {
                                        var thisID = currentData.id;
                                        // select correct row
                                        var selRows = d3.selectAll("tbody tr").filter(function(d) { return d.id === thisID; });
                                        d3.keys(currentData).forEach (function (key) {	// copy new data points to row data
                                            var newVal = newData[key];
                                            if (newVal !== undefined) {
                                                currentData[key] = newVal;
                                            }
                                        });
                                        d3table.update();
                                    };
                                    //updateCurrentRow (d, {}); // alternative to following code for testing without doing database actions

                                    // Ajax restart call
                                     var doRestart = function() {

                                         $.ajax({
                                            type: "POST",
                                            url:"./php/restartSearch.php",
                                            data: {searchID: d.id},
                                            dataType: 'json',
                                            success: function (response, responseType, xmlhttp) {
                                                if (response.status === "success") {
                                                    //console.log ("response", response, d);
                                                    updateCurrentRow (d, response.result[0]);
                                                }
                                            },
                                             error: function (jqxhr, text, error) {
                                                 console.log ("error", arguments);
                                             }
                                        });

                                    };

                                    var dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', minute: 'numeric', hour: 'numeric', second: 'numeric' };
                                    var dateStr = new Date(Date.parse(d.submit_date)).toLocaleDateString("en-GB-u-hc-h23", dateOptions)
                                    var msg = "Restart Search "+d.id+"?<br>Originally Submitted: "+dateStr;
                                    // Dialog
                                    CLMSUI.jqdialogs.areYouSureDialog (
                                        "popChoiceDialog",
                                        msg,
                                        "Please Confirm", "Yes, Restart this Search", "No, Cancel this Action",
                                        doRestart
                                    );
                                })
                            ;
                        };

                        /**
                        *   Add search validation functionality to buttons / links in table. This makes a pop-up
                        *   listing links to different validation types.
                        *   @function addValidationFunctionality
                        *   @inner
                        *   @memberof CLMSUI.history
                        *   @param selection - d3 selection of a table row (tr)
                        */
                        var addValidationFunctionality = function (selection) {
                            var lowScore = "&lowestScore=2";
                            selection.select(".validateButton")
                                .on ("click", function (d) {
                                    var deltaUrls = ["", "&decoys=1"+lowScore, "&linears=1"+lowScore, "&decoys=1&linears=1"+lowScore];
                                    var baseUrls = deltaUrls.map (function (deltaUrl) {
                                       return makeValidationUrl (d.id+"-"+d.random_id, "&unval=1"+deltaUrl);
                                    });

                                    CLMSUI.jqdialogs.choicesDialog ("popChoiceDialog", "Choose Validation Option", "Validate "+d.id,
                                        ["Validate", "Validate with Decoys", "Validate with Linears", "Validate with Decoys & Linears"],
                                        baseUrls
                                    );
                                })
                            ;
                        };


                        /**
                        *   Add aggregation setting functionality to input fields in table.
                        *   @function addAggregateFunctionality
                        *   @inner
                        *   @memberof CLMSUI.history
                        *   @param selection - d3 selection of a table row (tr)
                        */
                        var addAggregateFunctionality = function (selection) {
                            selection.select(".aggregateInput")
                                .on ("input", function(d) {
                                    // set value to 0-9
                                    this.value = this.value.slice (0,2); // equiv to maxlength for text
                                    // set backing data to this value
                                    if (d.value) {
                                        d.value[d.key] = this.value;
                                    } else {
                                        d.aggregate = this.value;
                                    }
                                    CLMSUI.history.anyAggGroupsDefined (response.data, this.value ? true : undefined);
                                })
                            ;
                        };


                        /**
                        *   Adds all the previous functionalities to a table row
                        *   @function empowerRows
                        *   @inner
                        *   @memberof CLMSUI.history
                        *   @param selection - d3 selection of a table row (tr)
                        */
                        var empowerRows = function (rowSelection) {
                            addDeleteButtonFunctionality (rowSelection);
                            addRestartButtonFunctionality (rowSelection);
                            //addBaseNewButtonFunctionality (rowSelection);
                            addValidationFunctionality (rowSelection);
                            addAggregateFunctionality (rowSelection);
                            updateHiddenRowStates (rowSelection);
                        };


                        // Make the d3 table - data, column settings and ordering
                        var d3tableElem = d3.select(".container").append("div")
                            .datum({
                                data: response.data || [],
                                columnSettings: columnSettings,
                                columnOrder: d3.keys(columnSettings),
                            })
                        ;
                        var d3table = CLMSUI.d3Table ();
                        d3table (d3tableElem);
                        
                        // Apply header styling to generated d3 table
                        applyHeaderStyling (d3table.getHeaderCells());
                        console.log ("d3table", d3table);

                        // extract initial filters
                        var keyedFilters = {};
                        d3.keys(columnSettings).forEach (function (columnKey) {
                            var findex = d3table.getColumnIndex (columnKey);
                            keyedFilters[columnKey] = initialValues.filters[findex];
                        });

                        // set initial filters and add empowerRows as function to run after table update (makes functionality available)
                        d3table
                            .filter(keyedFilters)
                            .postUpdate (empowerRows)
                        ;

                        // set initial sort
                        if (initialValues.sort && initialValues.sort.column) {
                            d3table
                                .orderKey (d3table.columnOrder()[initialValues.sort.column])
                                .orderDir (initialValues.sort.sortDesc ? "desc" : "asc")
                                .sort()
                            ;
                        }
                        d3table.update();

                        // function that updates filter report text on filter updates
                        var filterReportUpdate = function (filterVals) {
                            var anyFilterValueSet = pluck(d3.values(filterVals), "value").some (function (f) { return f; });
                            var comma = d3.format(",");
                            var str = comma(d3table.getFilteredSize()) + (anyFilterValueSet ? " of " + comma(d3table.getData().length) : "") + " Searches";
                            d3.selectAll(".filterReporter").text(str);
                        };
                        
                        // Make dispatch object and attach events
                        var dispatch = d3table.dispatch();
                        dispatch.on ("columnHiding", storeColumnHiding);
                        dispatch.on ("filtering.store", storeFiltering);  // add two functions to filtering events by distinguishing with .
                        dispatch.on ("filtering.report", filterReportUpdate);
                        dispatch.on ("ordering", storeOrdering);

                        // add filter reporter, details effect of filter on row count
                        addFilterReporter (d3tableElem.select("div.d3tableControls"), d3table);

                        // add column selector, header entries has initial visibilities incorporated
                        addColumnSelector (d3tableElem.select("div.d3tableControls").datum(columnSettings), d3table, dispatch);

                        // add button to cancel table sort
                        addCancelSort (d3tableElem.select("div.d3tableControls"), d3table);

                        // hide delete column filter if not superuser as pointless
                        d3table.showFilterCell ("hidden", response.userRights.isSuperUser);

                        // allows css trick to highlight filter inputs with content so more visible to user
                        d3.selectAll(".d3table-filterInput")
                            .property("required", true)
                            .attr ("title", function(d,i) { return "Filter the table by "+d.value.columnName; })
                        ;

                        // add right-hand side divider bars to first page info widget
                        d3.selectAll(".d3table-pageInfo").classed("dividerSection", function(d,i) { return i === 0; });

                        // add plus minus buttons to replace number spinner
                        CLMSUI.history.addPlusMinusTableButtons (d3table);

                        // add clear aggregation button to specific header
                        var aggregateColumn = d3table.getColumnIndex("aggregate") + 1;
                        var aggButtonCell = d3tableElem.selectAll("thead tr:nth-child(2)").select("th:nth-child("+aggregateColumn+")");
                        addClearAggInputsButton (
                            aggButtonCell,
                            function() { return d3table.getAllRowsSelection(); },
                            response.data
                        );
                        CLMSUI.history.anyAggGroupsDefined (response.data, false);   // disable clear button as well to start with

                        // populate filter report span with initial filter state
                        filterReportUpdate (d3.values(d3table.filter()).map (function (d) { return {value: d}; }));
                    }
                }
            },
           error: function () {
                console.log ("error", arguments);
               //window.location.href = "../../xi3/login.html";
           }
       });
    },
    
    /**
    *   Launch an aggregated search in a new window/tab
    *   @param tableData - underlying table data - holds aggregation setting for each row
    *   @param fdrCapable - boolean - if true adds params to query string that permits fdr calculations
    */
    aggregate: function (tableData, fdrCapable) {
        var values = tableData
            .filter (function (d) {
                var valid = false;
                var agg = d.aggregate;
                if (agg) {
                    valid = !(isNaN(agg) || agg.length > 2);
                    if (!valid) { alert ("Group identifiers must be between 0 and 100."); }
                }
                return valid;
            })
            .map (function (d) { return d.id +"-" + d.random_id + "-" + d.aggregate})
        ;

        if (!values.length) { alert ("Cannot aggregate: no selection - must set numeric identifiers in 'Agg Group' table column."); }
        else {
            var url = CLMSUI.history.makeResultsUrl (values.join(','), fdrCapable ? "&unval=1&decoys=1" : "");
            window.open (url, "_self");
            //console.log ("URL", url);
        }
    },

    /**
    *   Clear the underlying table data aggregation settings and visible table inputs
    *   @param tableData - underlying table data - holds aggregation setting for each row
    *   @param d3TableRows - d3 selection of table rows
    */
    clearAggregationInputs: function (tableData, d3TableRows) {
        d3TableRows.selectAll(".aggregateInput").property("value", "");
        tableData.forEach (function (d) { d.aggregate = ""; });
        CLMSUI.history.anyAggGroupsDefined (tableData, false);
    },

    /**
    *   Ascertain if any aggregation selections have been made and set aggregation report fields accordingly
    *   @param tableData - underlying table data - holds aggregation setting for each row
    *   @param anySelected - set true/false if we know aggregation selections have been made, leave undefined otherwise
    */
    anyAggGroupsDefined: function (tableData, anySelected) {
        if (anySelected === undefined || anySelected === true) {
            var sel = tableData.filter (function(d) { return d.aggregate; });
            anySelected = sel.length > 0;
            var groups = d3.nest().key(function(d) { return d.aggregate; }).entries(sel);
            d3.selectAll("#selectedCounter").text(sel.length+" Selected across "+groups.length+(groups.length > 1 ? " Groups" : " Group"));
        }

        d3.selectAll("#aggSearch,#aggFDRSearch,.clearChx").property("disabled", !anySelected);
        d3.selectAll("#selectedCounter")
            .style ("visibility", anySelected ? "visible" : null)
        ;
    },

    /**
    *   Anonymise table for screenshot purposes
    */
    anonForScreenshot: function () {
        // Anon usernames, search names, current user. Remember to filter to completed searches only.
        d3.selectAll("tbody").selectAll("td:nth-child(12)").text(function() { return ["bert", "bob", "allan", "audrey", "fiona"][Math.floor(Math.random() * 5)]; });
        d3.selectAll("tbody").selectAll("td:nth-child(1) a").text(
            function() { return "anonymised "+(d3.shuffle("abcdefghijklmnopqrstuvwxyz".split("")).join("").substring(Math.ceil(Math.random()*25))); }
        );
        d3.select("#username").text("A Xi User");
    },

    /**
    *   Add horizontally aligned plus minus buttons for page navigation
    *   @param d3table - d3table object
    */
    addPlusMinusTableButtons: function (d3table) {
        d3table.getSelection()
            .selectAll(".d3table-pageInput .d3table-pageWidget")
            .each (function () {
                var spinner = $(this).spinner({
                    min: 1,
                    icons: { up: "ui-icon-plus", down: "ui-icon-minus"},
                    spin: function (event, ui) {
                        //console.log ("spin evt", event, ui);
                        d3table.page(+ui.value).update();
                        //console.log ("val", ui.value, d3table.page());
                        event.stopPropagation();
                        event.preventDefault(); // let d3table take care of input value setting (otherwise spinner shoots past max page value)
                    },
                });
            })
        ;
    },

    /**
    *   Misnamed really, gets value from localStorage for a given field. If no localstorage, gets value from non-persistent variable
    *   @param field - property to retrieve
    *   @param force - get value regardless of current permission
    *   @returns field value
    */
    getCookieValue: function (field, force) {
        if (force || this.youMayRememberMe()) {
            var xiCookie = localStorage.getItem ("xiHistory");
            if (xiCookie) {
                xiCookie = JSON.parse (xiCookie);
                return field ? xiCookie[field] : xiCookie;
            }
        }

        return this.tempValues[field];
    },

    /**
    *   Misnamed really, sets value in localStorage for a given field. If no localstorage, sets value in non-persistent variable
    *   @param field - property to store
    *   @param value - value to set for property
    *   @param force - set value regardless of current permission
    */
    updateCookie: function (field, value, force) {
        if (force || this.youMayRememberMe()) {
            var xiCookie = localStorage.getItem("xiHistory");
            if (!xiCookie) {
                localStorage.setItem ("xiHistory", JSON.stringify(this.tempValues));
                xiCookie = localStorage.getItem("xiHistory");
            }
            xiCookie = JSON.parse (xiCookie);
            xiCookie[field] = value;
            localStorage.setItem ("xiHistory", JSON.stringify(xiCookie));
        }

        this.tempValues[field] = value;	// store values temporarily in case the user decides to press 'keep' later on
    },

    /**
    *   Is local storage avaiable?
    *   @returns - true if local storage available
    */
    canLocalStorage: function () {
        try {
            localStorage.setItem ('mod', 'mod');
            localStorage.removeItem ('mod');
            return true;
        } catch(e) {
            return false;
        }
    },

    /**
    *   Can we store user preferences?
    *   @returns - true if we can store user preferences
    */
    youMayRememberMe: function () {
        if (this.canLocalStorage()) {
            return this.getCookieValue ("rememberMe", true) || false;
        }
        return false;
    },

    /**
    *   Set whether we can store user preferences
    *   @param event - DOM event on a checkbox; event.target.checked is the needed value
    */
    setRemember: function (event) {
        if (this.canLocalStorage()) {
            this.updateCookie ("rememberMe", event.target.checked ? true : false, true);
            if (this.youMayRememberMe()) {
                localStorage.setItem ("xiHistory", JSON.stringify(this.tempValues));	// write temp values into localstorage if keep switched to on
            }
        }
    }
};
