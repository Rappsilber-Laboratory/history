import * as $ from "jquery";
import d3 from "d3";
import {Spinner} from "spin.js";
import {jqdialogs} from "./dialogs";
import {d3Table} from "./d3table";

function makeResultsUrl(sid, params) {
    return "../xi3/network.php?upload=" + sid + params;
}

const defaultValues = {
    // visibility: {
    //     "Visualise Data": true,
    /*upload time*/
    //     "Spectra Only": true,
    //     "Provider": true,
    //     "Audits": true,
    //     "Samples": true,
    //     "Bib. Refs": true,
    //     "Spectra Formats": true,
    //     "Upload Error": true,
    //     "Upload Warnings": true,
    //     "Agg Group": true,
    //     "Delete": true,
    // },
    filters: {},
    sort: {
        column: null,
        sortDesc: null
    },
};

const tempValues = {};	// store user values temporarily, in case they decide to 'keep' later on

function getInitialValues() {
    const cookieValues = getCookieValue() || {};
    //console.log ("cookieValues", cookieValues);
    // cookieValues overwrites currentRadio which overwrites initialValues
    return $.extend({}, defaultValues, {/*searchScope: currentRadio.size() === 1 ? currentRadio.attr("id") : undefined*/}, cookieValues);
}

export function init() {
    // var self = this;
    d3.select("#scopeOptions").selectAll("input[type='radio']")
        .on("change", function () {
            // updateCookie("searchScope", d3.select(this).attr("id"));
            loadSearchList();
        });
    // get default / cookie values
    this.tempValues = getInitialValues();
    // d3.select("#" + initialValues.searchScope).property("checked", true);
    if (!canLocalStorage) {
        d3.select("#rememberOption").style("display", "none");
    }
    d3.select("#rememberOption input[type='checkbox']").property("checked", youMayRememberMe());
}

export function loadSearchList() {
    const initialValues = getInitialValues();	// get default / cookie values

    d3.selectAll(".d3tableContainer").remove();
    d3.selectAll("button").classed("btn btn-1 btn-1a", true);

    const self = this;

    const columnSettings = {
        filename: {columnName: "Visualise Data", type: "alpha", headerTooltip: "", visible: true, removable: true},
        validate: {columnName: "Spectra Only", type: "none", headerTooltip: "", visible: true, removable: true},
        provider: {columnName: "Provider", type: "alpha", headerTooltip: "", visible: true, removable: true},
        audits: {columnName: "Audits", type: "alpha", headerTooltip: "", visible: true, removable: true},
        samples: {columnName: "Samples", type: "alpha", headerTooltip: "", visible: true, removable: true},
        bib: {columnName: "Bib. Refs", type: "alpha", headerTooltip: "", visible: true, removable: true},
        spectra_formats: {
            columnName: "Spectra Formats",
            type: "alpha",
            headerTooltip: "",
            visible: true,
            removable: true
        },
        upload_time: {columnName: "Upload Time", type: "alpha", headerTooltip: "", visible: true, removable: true},
        // contains_crosslinks: {
        //     columnName: "Crosslinks",
        //     type: "boolean",
        //     headerTooltip: "",
        //     visible: true,
        //     removable: true
        // },
        upload_error: {columnName: "Upload Error", type: "alpha", headerTooltip: "", visible: true, removable: true},
        error_type: {columnName: "Error Type", type: "alpha", headerTooltip: "", visible: true, removable: true},
        upload_warnings: {
            columnName: "Upload Warnings",
            type: "alpha",
            headerTooltip: "",
            visible: true,
            removable: true
        },
        aggregate: {
            columnName: "Agg Group",
            type: "clearCheckboxes",
            headerTooltip: "Assign numbers to searches to make groups within an aggregated search",
            visible: true,
            removable: false
        },
        hidden: {columnName: "Delete", type: "none", headerTooltip: "", visible: true, removable: true},
    };

    // Set visibilities of columns according to cookies or default values
    d3.entries(columnSettings).forEach(function (columnEntry) {
        columnEntry.value.visible = true; //initialValues.visibility[columnEntry.value.columnName];
    }, this);

    const pluck = function (data, prop) {
        return data.map(function (d) {
            return d[prop];
        });
    };

    if (d3.select(".container #clmsErrorBox").empty()) {
        const statusBox = d3.select(".container")
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

            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
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

                    d3.select("#username").text("(" + response.user + ")");

                    const makeResultsLink = function (sid, params, label) {
                        return "<a href='" + makeResultsUrl(sid, params) + "'>" + label + "</a>";
                    };

                    const makeValidationLink = function (sid, params, label) {
                        return "<a href='" + makeValidationUrl(sid, params) + "'>" + label + "</a>";
                    };

                    var makeValidationUrl = function (sid, params) {
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
                        filename: function (d) {
                            return tooltipHelper(d, "filename");
                        },
                        provider: function (d) {
                            return jsonTooltipHelper(d, "provider");
                        },
                        audits: function (d) {
                            return jsonTooltipHelper(d, "audits");
                        },
                        samples: function (d) {
                            return jsonTooltipHelper(d, "samples");
                        },
                        bib: function (d) {
                            return jsonTooltipHelper(d, "bib");
                        },
                        spectra_formats: function (d) {
                            return jsonTooltipHelper(d, "spectra_formats");
                        },

                        upload_time: function (d) {
                            return d.value.upload_time;
                        },
                        upload_error: function (d) {
                            return d.upload_error;
                        },
                        error_type: function (d) {
                            return d.error_type;
                        },
                        upload_warnings: function (d) {
                            return jsonTooltipHelper(d, "upload_warnings");
                        }
                    };

                    const cellStyles = {
                        //name: "varWidthCell",
                        filename: "varWidthCell2",
                    };

                    const cellHeaderOnlyStyles = {
                        //fdr: "dottedBorder",
                    };

                    const cellWidths = {
                        filename: "20em",
                        peak_list_file_names: "20em",
                        validate: "5em",
                        aggregate: "6em",
                        hidden: "5em",
                    };

                    const isErrorMsg = function (msg) {
                        return (msg.substr(0, 4) === "XiDB" || msg.substr(0, 10) === "UNFINISHED");
                    };

                    const modifiers = {
                        filename: function (d) {
                            const completed = true;//d.status === "completed";
                            const name = d.filename;//d.name.length < 200 ? d.name : (d.name.substring (0, 200) + "…");
                            // var error = !completed && d.status.substring(0,4) === "XiDB";
                            return completed ? makeResultsLink(d.id + "-" + d.random_id, "", name)
                                : "<span class='unviewableSearch'>" + name + "</span>";// + (error ? "<span class='xierror'>" : "") + " ["+d.status.substring(0,16)+"]" + (error ? "</span>" : "")
                            /*+ (d.status.length <= 16 ? "" : "<div style='display:none'>"+d.status+"</div>")*/

                        },
                        validate: function (d) {
                            return makeValidationLink(d.id + "-" + d.random_id, "", "View Spectra");
                        },
                        provider: function (d) {
                            if (d.provider) {
                                return d.provider.ContactRole ? d.provider.ContactRole[0].contact_ref : "";
                            } else {
                                return "";
                            }
                        },
                        audits: function (d) {
                            let text = "";
                            if (d.audits) {
                                if (d.audits.Person && d.audits.Person.name) {
                                    text += d.audits.Person.name;
                                }
                                if (d.audits.Organization && d.audits.Organization.name) {
                                    if (text != "") {
                                        text += " ";
                                    }
                                    text += d.audits.Organization.name;
                                }
                            }
                            return text;
                        },
                        samples: function (d) {
                            let text = "";
                            if (d.samples) {
                                for (let i = 0; i < d.samples.length; i++) {
                                    if (text != "") {
                                        text += "; ";
                                    }
                                    const sample = d.samples[i];
                                    if (sample["sample name"]) {
                                        text += sample["sample name"];
                                    } else if (sample.id) {
                                        text += sample.id;
                                    } else if (sample.name) {
                                        text += sample.name;
                                    }
                                }
                            }
                            return text;
                        },
                        bib: function (d) {
                            return JSON.stringify(d.bib);
                        },
                        spectra_formats: function (d) {
                            //JSON.stringify(d.spectra_formats);
                            let text = "";
                            if (d.spectra_formats) {
                                for (let i = 0; i < d.spectra_formats.length; i++) {
                                    if (text != "") {
                                        text += "; ";
                                    }
                                    const sf = d.spectra_formats[i];
                                    if (sf.FileFormat) {
                                        text += sf.FileFormat.name + ", ";
                                    }
                                    if (sf.SpectrumIDFormat) {
                                        text += sf.SpectrumIDFormat.name;
                                    }
                                }
                            }
                            return text;
                        },

                        upload_time: function (d) {
                            return d.upload_time;
                        },
                        // contains_crosslinks: function (d) {
                        //     return isTruthy(d.contains_crosslinks);
                        // },
                        upload_error: function (d) {
                            return d.upload_error;
                        },
                        error_type: function (d) {
                            return d.error_type;
                        },
                        upload_warnings: function (d) {
                            let text = "";
                            if (d.upload_warnings) {
                                for (let i = 0; i < d.upload_warnings.length; i++) {
                                    if (text != "") {
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
                        hidden: function (d) {
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

                    //console.log ("rights", response.userRights);
                    //console.log ("data", response.data);

                    // Sanitise, get rid of html, comment characters that could be exploited
                    const sanitise = function (data) {
                        const escapeHtml = function (html) {
                            const fn = function (tag) {
                                const charsToReplace = {
                                    "&": "&amp;",
                                    "<": "&lt;",
                                    ">": "&gt;",
                                    "\"": "&#34;",
                                };
                                return charsToReplace[tag] || tag;
                            };
                            return html ? html.replace(/[&<>"]/g, fn) : html;
                        };

                        if (data.length) {
                            let keys = d3.set(d3.keys(data[0]));
                            ["id", "submit_date", "status", "random_id"].forEach(function (notkey) {
                                keys.remove(notkey);   // database generated fields so not an issue
                            });
                            keys = keys.values();
                            //console.log ("keys", keys);
                            data.forEach(function (row) {
                                for (let k = 0; k < keys.length; k++) {
                                    const kk = keys[k];
                                    row[kk] = escapeHtml(row[kk]);
                                }
                            });
                        }
                    };
                    //var a = performance.now();
                    //sanitise (response.data);
                    //var b = performance.now() - a;
                    //console.log ("sanity in", b, "ms.");

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



                    // Add a multiple select widget for column visibility
                    // eslint-disable-next-line no-inner-declarations
                    function addColumnSelector(containerSelector, d3table, dispatch) {
                        const newtd = containerSelector;
                        newtd.append("span").text("Show Columns");
                        const datum = newtd.datum();
                        const removableColumns = d3.entries(datum).filter(function (d) {
                            return d.value.removable;
                        });
                        newtd.append("select")
                            .property("multiple", true)
                            .selectAll("option")
                            .data(removableColumns, function (d) {
                                return d.key;
                            })
                            .enter()
                            .append("option")
                            .text(function (d) {
                                return d.value.columnName;
                            })
                            .property("value", function (d) {
                                return d.key;
                            })
                            .property("selected", function (d) {
                                return d.value.visible;
                            });
                        $(newtd.select("select").node()).multipleSelect({
                            selectAll: false,
                            onClick: function (view) {
                                // hide/show column chosen by user
                                const key = view.value;
                                datum[key].visible = view.checked;
                                d3table.showColumn(d3table.getColumnIndex(key) + 1, view.checked);
                                dispatch.columnHiding(view.label, view.checked);
                            }
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
                    function updateHiddenRowStates(selectedRows) {
                        // reset button text and row appearance
                        selectedRows.selectAll(".deleteButton").text(function (d) {
                            return isTruthy(d.hidden) ? "Restore" : "Delete";
                        });
                        selectedRows.classed("hiddenSearch", function (d) {
                            return isTruthy(d.hidden);
                        });
                    }

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
                                        success: function (response, responseType, xmlhttp) {
                                            if (response.status === "success") {
                                                console.log("response", response);
                                                d.hidden = response.newHiddenState;
                                                deleteRowVisibly(d);
                                            }
                                        }
                                    });
                                };

                                const basicMsg = "Delete" + " Upload " + d.filename + "?";
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


                    const addRestartButtonFunctionality = function (selection) {
                        selection.select("button.restartButton")
                            .classed("btn btn-1 btn-1a", true)
                            .on("click", function (d) {
                                // Post restart code
                                const updateCurrentRow = function (currentData, newData) {
                                    const thisID = currentData.id;
                                    // select correct row
                                    const selRows = d3.selectAll("tbody tr").filter(function (d) {
                                        return d.id === thisID;
                                    });
                                    d3.keys(currentData).forEach(function (key) {	// copy new data points to row data
                                        const newVal = newData[key];
                                        if (newVal !== undefined) {
                                            currentData[key] = newVal;
                                        }
                                    });
                                    d3table.update();
                                };
                                //updateCurrentRow (d, {}); // alternative to following code for testing without doing database actions

                                // Ajax restart call
                                const doRestart = function () {

                                    $.ajax({
                                        type: "POST",
                                        url: "./php/restartSearch.php",
                                        data: {searchID: d.id},
                                        dataType: "json",
                                        success: function (response, responseType, xmlhttp) {
                                            if (response.status === "success") {
                                                //console.log ("response", response, d);
                                                updateCurrentRow(d, response.result[0]);
                                            }
                                        },
                                        error: function (jqxhr, text, error) {
                                            console.log("error", arguments);
                                        }
                                    });

                                };

                                const dateOptions = {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    minute: "numeric",
                                    hour: "numeric",
                                    second: "numeric"
                                };
                                const dateStr = new Date(Date.parse(d.submit_date)).toLocaleDateString("en-GB-u-hc-h23", dateOptions);
                                const msg = "Restart Search " + d.id + "?<br>Originally Submitted: " + dateStr;
                                // Dialog
                                jqdialogs.areYouSureDialog(
                                    "popChoiceDialog",
                                    msg,
                                    "Please Confirm", "Yes, Restart this Search", "No, Cancel this Action",
                                    doRestart
                                );
                            });
                    };


                    const addValidationFunctionality = function (selection) {
                        const lowScore = "&lowestScore=2";
                        selection.select(".validateButton")
                            .on("click", function (d) {
                                const deltaUrls = ["", "&decoys=1" + lowScore, "&linears=1" + lowScore, "&decoys=1&linears=1" + lowScore];
                                const baseUrls = deltaUrls.map(function (deltaUrl) {
                                    return makeValidationUrl(d.id + "-" + d.random_id, "&unval=1" + deltaUrl);
                                });

                                jqdialogs.choicesDialog("popChoiceDialog", "Choose Validation Option", "Validate " + d.id,
                                    ["Validate", "Validate with Decoys", "Validate with Linears", "Validate with Decoys & Linears"],
                                    baseUrls
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
                        // addRestartButtonFunctionality (rowSelection);
                        // addBaseNewButtonFunctionality (rowSelection);
                        //addValidationFunctionality (rowSelection);
                        addAggregateFunctionality(rowSelection);
                        // updateHiddenRowStates (rowSelection);
                    };


                    const d3tableElem = d3.select(".container").append("div")
                        .datum({
                            data: response.data || [],
                            columnSettings: columnSettings,
                            columnOrder: d3.keys(columnSettings),
                        });
                    var d3table = d3Table();
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

                    var dispatch = d3table.dispatch();
                    dispatch.on("columnHiding", storeColumnHiding);
                    dispatch.on("filtering", storeFiltering);
                    dispatch.on("ordering", storeOrdering);

                    // add column selector, header entries has initial visibilities incorporated
                    addColumnSelector(d3tableElem.select("div.d3tableControls").datum(columnSettings), d3table, dispatch);

                    // hide delete filter if not superuser as pointless
                    //d3table.showFilterCell ("hidden", response.userRights.isSuperUser);

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

// cookie store if allowed
function storeColumnHiding(value, checked) {
    const visibilities = getCookieValue("visibility");
    if (visibilities) {
        visibilities[value] = checked;
        updateCookie("visibility", visibilities);
    }
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


// function getCookieValue (field) {
// 		if (this.cookieContext.Cookies !== undefined) {
// 			var xiCookie = this.cookieContext.Cookies.getJSON("xiHistory");
// 			if (xiCookie) {
// 				return field ? xiCookie[field] : xiCookie;
// 			}
// 		}
// 		return undefined;
// 	}
//
// function	updateCookie (field, value) {
// 		if (this.cookieContext.Cookies !== undefined) {
// 			var xiCookie = this.cookieContext.Cookies.getJSON("xiHistory");
// 			if (xiCookie) {
// 				xiCookie[field] = value;
// 				this.cookieContext.Cookies.set("xiHistory", xiCookie);
// 			}
// 		}
// 	}

function getCookieValue(field, force) {
    if (force || youMayRememberMe()) {
        let xiCookie = localStorage.getItem("xiHistory");
        if (xiCookie) {
            xiCookie = JSON.parse(xiCookie);
            return field ? xiCookie[field] : xiCookie;
        }
    }

    return tempValues[field];
}

function updateCookie(field, value, force) {
    if (force || youMayRememberMe()) {
        let xiCookie = localStorage.getItem("xiHistory");
        if (!xiCookie) {
            localStorage.setItem("xiHistory", JSON.stringify(this.tempValues));
            xiCookie = localStorage.getItem("xiHistory");
        }
        xiCookie = JSON.parse(xiCookie);
        xiCookie[field] = value;
        localStorage.setItem("xiHistory", JSON.stringify(xiCookie));
    }

    this.tempValues[field] = value;	// store values temporarily in case the user decides to press 'keep' later on
}

//
// 	/*
// 	askCookiePermission: function (context) {
// 		this.cookieContext = context;
// 		var self = this;
//
// 		if (this.cookieContext.Cookies !== undefined && this.cookieContext.Cookies.get("xiHistory") === undefined) {
// 			CLMSUI.jqdialogs.areYouSureDialog (
// 				"popChoiceDialog",
// 				"Can we use cookies to track your preferences on this page?",
// 				"Cookies", "Yes", "No",
// 				function () {
// 					self.cookieContext.Cookies.set("xiHistory",
// 						self.defaultValues,
// 						{ expires : 365 }
// 					);
// 				}
// 			);
// 		}
// 	},
// 	*/
//
// is local storage viable?
function canLocalStorage() {
    try {
        localStorage.setItem("mod", "mod");
        localStorage.removeItem("mod");
        return true;
    } catch (e) {
        return false;
    }
}


function youMayRememberMe() {
    if (canLocalStorage()) {
        return getCookieValue("rememberMe", true) || false;
    }
    return false;
}


export function setRemember(event) {
    if (canLocalStorage()) {
        updateCookie("rememberMe", event.target.checked ? true : false, true);
        if (youMayRememberMe()) {
            localStorage.setItem("xiHistory", JSON.stringify(this.tempValues));	// write temp values into localstorage if keep switched to on
        }
    }
}


function deleteAccountDialog() {
    jqdialogs.areYouSureDialog("Delete_account", "Delete account and all data - are your sure?", "Delete Account", "DELETE EVERYTHING", "CANCEL", function () {
        alert("ok, its gone");
    });
}

