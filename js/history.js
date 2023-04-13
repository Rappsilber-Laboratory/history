import "../../xiNET_website/css/reset.css";
import "../../xiNET_website/css/common.css";
import "../css/history.css";
import "../css/d3table.css";
// import "../css/jquery-ui.css";

import * as $ from "jquery";
import d3 from "d3";
import {Spinner} from "spin.js";
import {jqdialogs} from "./dialogs";
import {d3Table} from "./d3table";

function makeResultsUrl(sid, params) {
    return "../xi3/network.php?upload=" + sid + params;
}

const defaultValues = {
    filters: {},
    sort: {
        column: null,
        sortDesc: null
    },
};

export function loadSearchList() {
    const cookieValues = getCookieValue() || {};
    const initialValues = $.extend({}, defaultValues, cookieValues);	// get default / cookie values

    d3.selectAll(".d3tableContainer").remove();
    d3.selectAll("button").classed("btn btn-1 btn-1a", true);

    const self = this;

    const columnSettings = {
        identification_file_name: {columnName: "Visualise Network", type: "alpha", headerTooltip: "", visible: true},
        validate: {columnName: "Spectra Only", type: "none", headerTooltip: "", visible: true},
        upload_time: {columnName: "Upload Time", type: "alpha", headerTooltip: "", visible: true},
        upload_error: {columnName: "Upload Error", type: "alpha", headerTooltip: "", visible: true},
        upload_warnings: {
            columnName: "Warnings",
            type: "alpha",
            headerTooltip: "",
            visible: true
        },
        aggregate: {
            columnName: "Agg Group",
            type: "clearCheckboxes",
            headerTooltip: "Assign numbers to searches to make groups within an aggregated search",
            visible: true
        },
        hidden: {columnName: "Delete", type: "none", headerTooltip: "", visible: true},
    };

    const pluck = function (data, prop) {
        return data.map(function (d) {
            return d[prop];
        });
    };

    if (d3.select(".container #clmsErrorBox").empty()) {
        d3.select(".container")
            .append("div")
            .attr("id", "clmsErrorBox")
            .append("div")
            .attr("class", "spinGap");
    }
    d3.select(".container #clmsErrorBox")
        .style("display", null)
        .select("div.spinGap")
        .text("Loading Search Metadata from Xi Database.");

    const spinner = new Spinner({scale: 1, left: 12}).spin(d3.select("#clmsErrorBox").node());

    const t1 = performance.now();

    $.ajax({
        type: "POST",
        url: "./php/uploads.php",
        contentType: "application/x-www-form-urlencoded",
        dataType: "json",
        success: function (response, responseType, xmlhttp) {
            const t2 = performance.now();
            console.log("STOP AJAX +", t2 - t1, "DB", response.time, "I/O", ((t2 - t1) / 1000) - response.time);
            spinner.stop();

            if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
                //console.log ("response", response, responseType);
                if (response.redirect) {
                    window.location.replace(response.redirect);
                } else if (response.status === "fail") {
                    d3.select("#clmsErrorBox").text(response.error || "Database Error");
                    console.log("response error", response);
                } else {
                    // This is a catch until new usergui is rolled out */
                    if (response.utilsLogout) {
                        d3.select("#logout")
                            .attr("onclick", null)
                            .on("click", function () {
                                window.location.replace("../../util/logout.php");
                            });
                    }

                    d3.select("#aggSearch").on("click", function () {
                        self.aggregate(response.data, false);
                    });
                    d3.select("#aggFDRSearch").on("click", function () {
                        self.aggregate(response.data, true);
                    });

                    d3.select("#username").text(response.user);

                    const makeResultsLink = function (sid, params, label) {
                        return "<a href='" + makeResultsUrl(sid, params) + "'>" + label + "</a>";
                    };

                    const makeValidationLink = function (sid, params, label) {
                        return "<a href='" + makeValidationUrl(sid, params) + "'>" + label + "</a>";
                    };

                    const makeValidationUrl = function (sid, params) {
                        return "../xi3/validate.php?upload=" + sid + params;
                    };

                    const isTruthy = function (val) {
                        return val === true || val === "t" || val === "true";
                    };

                    const tooltipHelper = function (d, field) {
                        return d.value.id + ": " + d.value[field];
                    };

                    const jsonTooltipHelper = function (d, field) {
                        return JSON.stringify(d.value[field], null, 4);
                    };

                    const tooltips = {
                        identification_file_name: function (d) {
                            return tooltipHelper(d, "identification_file_name");
                        },
                        upload_time: function (d) {
                            return d.value.upload_time;
                        },
                        upload_error: function (d) {
                            return d.upload_error;
                        },
                        upload_warnings: function (d) {
                            return jsonTooltipHelper(d, "upload_warnings");
                        }
                    };

                    const cellStyles = {
                        //name: "varWidthCell",
                        identification_file_name: "varWidthCell2",
                    };

                    const cellHeaderOnlyStyles = {
                        //fdr: "dottedBorder",
                    };

                    const cellWidths = {
                        identification_file_name: "20em",
                        // peak_list_file_names: "20em",
                        validate: "8em",
                        upload_time: "10em",
                        upload_error: "5em",
                        upload_warnings: "5em",
                        aggregate: "6em",
                        hidden: "5em",
                    };

                    const modifiers = {
                        identification_file_name: function (d) {
                            const completed = true;//d.status === "completed";
                            const name = d.identification_file_name;//d.name.length < 200 ? d.name : (d.name.substring (0, 200) + "…");
                            // var error = !completed && d.status.substring(0,4) === "XiDB";
                            return completed ? makeResultsLink(d.id + "-" + d.random_id, "", name)
                                : "<span class='unviewableSearch'>" + name + "</span>";// + (error ? "<span class='xierror'>" : "") + " ["+d.status.substring(0,16)+"]" + (error ? "</span>" : "")
                            /*+ (d.status.length <= 16 ? "" : "<div style='display:none'>"+d.status+"</div>")*/

                        },
                        validate: function (d) {
                            return makeValidationLink(d.id + "-" + d.random_id, "", "View Spectra");
                        },
                        upload_time: function (d) {
                            return d.upload_time;
                        },
                        upload_error: function (d) {
                            return d.upload_error;
                        },
                        upload_warnings: function (d) {
                            let text = "";
                            if (d.upload_warnings) {
                                for (let i = 0; i < d.upload_warnings.length; i++) {
                                    if (text !== "") {
                                        text += "; ";
                                    }
                                    text += d.upload_warnings[i].type;
                                }
                            }
                            return text;
                        },
                        aggregate: function (d) {
                            const completed = true;//d.status === "completed";
                            return completed ? "<input type='number' pattern='\\d*' class='aggregateInput' id='agg_" + d.id + "-" + d.random_id + "' maxlength='1' min='1' max='9'" + (d.aggregate ? " value='" + d.aggregate + "'" : "") + ">" : "";
                        },
                        hidden: function () {
                            return "<button class='deleteButton unpadButton'>Delete</button>";
                        }
                    };

                    const propertyNames = ["cellStyle", "dataToHTMLModifier", "tooltip"];
                    [cellStyles, modifiers, tooltips].forEach(function (obj, i) {
                        d3.entries(obj).forEach(function (entry) {
                            columnSettings[entry.key][propertyNames[i]] = entry.value;
                        });
                    });


                    d3.select("#clmsErrorBox").style("display", response.data ? "none" : null);    // hide no searches message box if data is returned
                    if (!response.data) {
                        d3.select("#clmsErrorBox").text("You Currently Have No Searches in the Xi Database.");
                    }

                    /* Everything up to this point helps generates the dynamic table */

                    // button to clear aggregation checkboxes
                    // eslint-disable-next-line no-inner-declarations
                    function addClearAggInputsButton(buttonContainer, d3rowFunc, data) {
                        buttonContainer
                            .append("button")
                            .text("Clear ↓")
                            .attr("class", "btn btn-1 btn-1a clearChx unpadButton")
                            .attr("title", "Clear all searches chosen for aggregation")
                            .on("click", function () {
                                clearAggregationInputs(d3rowFunc(), data);
                            });
                    }

                    // eslint-disable-next-line no-inner-declarations
                    function applyHeaderStyling(headers) {
                        let title = headers.select("svg").select("title");
                        if (title.empty()) {
                            title = headers.select("svg").append("title");
                        }
                        title.text(function (d) {
                            return "Sort table by " + columnSettings[d.key].columnName;
                        });

                        headers
                            .filter(function (d) {
                                return cellStyles[d.key];
                            })
                            .each(function (d) {
                                d3.select(this).classed(cellStyles[d.key], true);
                            });
                        headers
                            .filter(function (d) {
                                return cellHeaderOnlyStyles[d.key];
                            })
                            .each(function (d) {
                                d3.select(this).classed(cellHeaderOnlyStyles[d.key], true);
                            });
                        headers
                            .filter(function (d) {
                                return cellWidths[d.key];
                            })
                            .each(function (d) {
                                d3.select(this).style("width", cellWidths[d.key]);
                            });
                    }

                    // hidden row state can change when restore/delete pressed or when restart pressed
                    // eslint-disable-next-line no-inner-declarations
                    // function updateHiddenRowStates(selectedRows) {
                    //     // reset button text and row appearance
                    //     selectedRows.selectAll(".deleteButton").text(function (d) {
                    //         return isTruthy(d.hidden) ? "Restore" : "Delete";
                    //     });
                    //     selectedRows.classed("hiddenSearch", function (d) {
                    //         return isTruthy(d.hidden);
                    //     });
                    // }

                    // Add functionality to buttons / links in table
                    const addDeleteButtonFunctionality = function (selection) {
                        selection.select("button.deleteButton")
                            .classed("btn btn-1 btn-1a", true)
                            .on("click", function (d) {
                                // Post deletion code
                                const deleteRowVisibly = function (d) {
                                    // delete row from table somehow
                                    const index = pluck(response.data, "id").indexOf(d.id);
                                    if (index >= 0) {
                                        response.data.splice(index, 1);
                                        d3table.filter(d3table.filter()).update();
                                    }
                                };
                                //deleteRowVisibly (d); // alternative to following code for testing without doing database delete

                                // Ajax delete/restore call
                                const doDelete = function () {
                                    $.ajax({
                                        type: "POST",
                                        url: "./php/deleteSearch.php",
                                        data: {searchID: d.id + "-" + d.random_id},
                                        dataType: "json",
                                        // eslint-disable-next-line no-unused-vars
                                        success: function (response, responseType, xmlhttp) {
                                            if (response.status === "success") {
                                                console.log("response", response);
                                                d.hidden = response.newHiddenState;
                                                deleteRowVisibly(d);
                                            }
                                        }
                                    });
                                };

                                const basicMsg = "Delete" + " Upload " + d.identification_file_name + "?";
                                const msg = basicMsg + "<br>This action cannot be undone (by yourself or anyone else).<br>Are You Sure?";

                                // Dialog
                                jqdialogs.areYouSureDialog(
                                    "popChoiceDialog",
                                    msg,
                                    "Please Confirm", "Yes, " + (isTruthy(d.hidden) ? "Restore" : "Delete") + " this Search", "No, Cancel this Action",
                                    doDelete
                                );
                            });
                    };

                    const addAggregateFunctionality = function (selection) {
                        selection.select(".aggregateInput")
                            .on("input", function (d) {
                                // set value to 0-9
                                this.value = this.value.slice(0, 2); // equiv to maxlength for text
                                // set backing data to this value
                                if (d.value) {
                                    d.value[d.key] = this.value;
                                } else {
                                    d.aggregate = this.value;
                                }
                                anyAggGroupsDefined(response.data, this.value ? true : undefined);
                            });
                    };

                    const empowerRows = function (rowSelection) {
                        addDeleteButtonFunctionality(rowSelection);
                        addAggregateFunctionality(rowSelection);
                    };

                    const d3tableElem = d3.select(".container").append("div")
                        .datum({
                            data: response.data || [],
                            columnSettings: columnSettings,
                            columnOrder: d3.keys(columnSettings),
                        });
                    const d3table = d3Table();
                    d3table(d3tableElem);
                    applyHeaderStyling(d3table.getHeaderCells(), columnSettings);
                    // console.log("d3table", d3table);

                    // set initial filters
                    const keyedFilters = {};
                    d3.keys(columnSettings).forEach(function (columnKey) {
                        const findex = d3table.getColumnIndex(columnKey);
                        keyedFilters[columnKey] = initialValues.filters[findex];
                    });

                    d3table
                        .filter(keyedFilters)
                        .postUpdate(empowerRows);

                    // set initial sort
                    if (initialValues.sort && initialValues.sort.column) {
                        d3table
                            .orderKey(d3table.columnOrder()[initialValues.sort.column])
                            .orderDir(initialValues.sort.sortDesc ? "desc" : "asc")
                            .sort();
                    }
                    d3table.update();

                    const dispatch = d3table.dispatch();
                    // dispatch.on("columnHiding", storeColumnHiding);
                    dispatch.on("filtering", storeFiltering);
                    dispatch.on("ordering", storeOrdering);

                    // allows css trick to highlight filter inputs with content so more visible to user
                    d3.selectAll(".d3table-filterInput").property("required", true);

                    // add clear aggregation button to specific header
                    const aggregateColumn = d3table.getColumnIndex("aggregate") + 1;
                    const aggButtonCell = d3tableElem.selectAll("thead tr:nth-child(2)").select("th:nth-child(" + aggregateColumn + ")");
                    addClearAggInputsButton(
                        aggButtonCell,
                        function () {
                            return d3table.getAllRowsSelection();
                        },
                        response.data
                    );
                    anyAggGroupsDefined(response.data, false);   // disable clear button as well to start with

                }
            }
        },
        error: function () {
            console.log("error", arguments);
            //window.location.href = "../../xi3/login.html";
        }
    });
}

function storeOrdering(sortColumn, sortDesc) {
    const sort = getCookieValue("sort");
    if (sort) {
        sort.column = sortColumn;
        sort.sortDesc = sortDesc;
        updateCookie("sort", sort);
    }
}

function storeFiltering(filterVals) {
    const filters = getCookieValue("filters");
    if (filters) {
        const dfilters = filterVals;
        const fobj = {};
        dfilters.forEach(function (df, i) {
            if (df !== "none" && df.value) {
                fobj[i] = df.value;
            }
        });
        updateCookie("filters", fobj);
    }
}

function aggregate(tableData, fdrCapable) {
    const values = tableData
        .filter(function (d) {
            let valid = false;
            const agg = d.aggregate;
            if (agg) {
                valid = !(isNaN(agg) || agg.length > 2);
                if (!valid) {
                    alert("Group identifiers must be between 0 and 100.");
                }
            }
            return valid;
        })
        .map(function (d) {
            return d.id + "-" + d.random_id + "-" + d.aggregate;
        });

    if (!values.length) {
        alert("Cannot aggregate: no selection - must set numeric identifiers in 'Agg Group' table column.");
    } else {
        const url = makeResultsUrl(values.join(","), fdrCapable ? "&unval=1&decoys=1" : "");
        window.open(url, "_self");
        //console.log ("URL", url);
    }
}

function clearAggregationInputs(d3TableRows, data) {
    d3TableRows.selectAll(".aggregateInput").property("value", "");
    data.forEach(function (d) {
        d.aggregate = "";
    });
    anyAggGroupsDefined(data, false);
}

function anyAggGroupsDefined(tableData, anySelected) {
    if (anySelected === undefined || anySelected === true) {
        const sel = tableData.filter(function (d) {
            return d.aggregate;
        });
        anySelected = sel.length > 0;
        const groups = d3.nest().key(function (d) {
            return d.aggregate;
        }).entries(sel);
        d3.selectAll("#selectedCounter").text(sel.length + " Selected across " + groups.length + (groups.length > 1 ? " Groups" : " Group"));
    }

    d3.selectAll("#aggSearch,#aggFDRSearch,.clearChx").property("disabled", !anySelected);
    d3.selectAll("#selectedCounter")
        .style("visibility", anySelected ? "visible" : null);
}

function getCookieValue(field, force) {
    let xiCookie = localStorage.getItem("xiHistory");
    if (xiCookie) {
        xiCookie = JSON.parse(xiCookie);
        return field ? xiCookie[field] : xiCookie;
    }
}

function updateCookie(field, value, force) {
    let xiCookie = localStorage.getItem("xiHistory");
    if (!xiCookie) {
        localStorage.setItem("xiHistory", JSON.stringify(this.tempValues));
        xiCookie = localStorage.getItem("xiHistory");
    }
    xiCookie = JSON.parse(xiCookie);
    xiCookie[field] = value;
    localStorage.setItem("xiHistory", JSON.stringify(xiCookie));
}

function deleteAccountDialog() {
    jqdialogs.areYouSureDialog("Delete_account", "Delete account and all data - are your sure?", "Delete Account", "DELETE EVERYTHING", "CANCEL", function () {
        alert("ok, its gone");
    });
}

