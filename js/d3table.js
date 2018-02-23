/*jslint browser: true, white: true, stupid: true, vars: true*/
var CLMSUI = CLMSUI || {};

CLMSUI.d3Table = function () {
	var data = [], filteredData = [], filter = [];
	var orderKey = null;
	var orderDirs = ["asc", "desc", "none"];
	var orderDir = orderDirs[0];
	var page = 0;
	var pageSize = 20;
	var columnOrder = ["key1", "key2"];
	var selection = null;
	var postUpdateFunc = null;
	var dataToHTMLModifiers = {};
	var pageCount = 1;
	var dispatch, cellStyles, tooltips;
	
	function my (mySelection) {	// data in selection should be 2d-array [[]]
		selection = mySelection;
		data = selection.datum().data;
		filteredData = data;
		columnOrder = selection.datum().columnOrder;
		
		if (selection.select("table").empty()) {
			var controls = selection.append("div").attr("class", "d3tableControls pagerInfo");
			var pageInfo = controls.append("span")
				.attr("class", "pageInfo")
			;
			pageInfo.append("span")
				.attr("class", "pageInput")
				.append ("input")
					.attr("type", "number")
					.attr("length", 3)
					.attr("min", 1)
					.attr ("value", 1)
					.on ("input", function () {
						var val = d3.select(this).property("value");
						doPageCount();
						val = Math.max (Math.min (val, pageCount), 1);
						my.page(val).update();
						//d3.select(this).property("value", val);
					})
			;
        	pageInfo.append("span").attr("class", "pageTotal");
			
			var table = selection.append("table").attr("class", "d3table");
			table.append("thead").selectAll("tr").data([0,1]).enter().append("tr");
			table.append("tbody");
		}
		
		var headerEntries = selection.datum().headerEntries;
		cellStyles = selection.datum().cellStyles;
		tooltips = selection.datum().tooltips;
		
		var headerCells = selection.select("thead tr:first-child").selectAll("th").data(headerEntries);
		headerCells.exit().remove();
		headerCells.enter().append("th").append("span");

		headerCells.each (function (d) {
			d3.select(this).select("span")
				.text (d.value.name)
				.attr ("title", d.value.tooltip)
			;
		});
		
		var filterCells = selection.select("thead tr:nth-child(2)").selectAll("th").data(headerEntries);
		filterCells.exit().remove();
		var passTypes = d3.set (["number", "alpha"]);
		filterCells.enter()
			.append("th")
			.filter (function (d) { return passTypes.has (d.value.type); })
			.each (function () {
				var filterHeader = d3.select(this);
				filterHeader.append("input")
					.attr("class", "filterInput")
					.attr("type", "text")
					.property("value", function(d) { return filter[d.value.filterID]; })
					.on ("input", function (d) {
						var filter = my.filter();
						filter[d.key] = d3.select(this).property("value");
						my.filter(filter).update();
					})
				;
				filterHeader.append("svg").attr("class", "arrow")
					.on ("click", function (d) {
						my.orderKey(d.key).sort();
						dispatch.ordering2 (d.key);
						my.update();
					})
					.append ("svg:path")
						.attr ("d", "M7.5 4 L 13.5 10 L 1.5 10 Z")
				;
			})
		;
		
		doPageCount();
		
		function setPageWidget (page) {
			selection.select(".pageInput input[type='number']").property ("value", page);
		};
		
		function setOrderButton (key) {
			var order = orderDirs.indexOf (orderDir);
			var rotate = [0, 180, 90][order];
			selection.selectAll("svg.arrow")
				.style ("transform", null).classed("active", false)
				.filter (function (d) { return d.key === key; })
				.style ("transform", "rotate("+rotate+"deg)").classed("active", true)
			;
		};
		
		dispatch = d3.dispatch("columnHiding", "filtering", "ordering", "ordering2", "pageNumbering");
		dispatch.on ("pageNumbering", setPageWidget);
		dispatch.on ("ordering2", setOrderButton);
		
		console.log ("data", data, filteredData);
	}
	
	function doPageCount () {
		pageCount = Math.max (1, Math.ceil (filteredData.length / my.pageSize()));
		return pageCount;
	}
	
	// helper function for next bit
	function displayColumn (columnIndex, show) {
		selection.selectAll("td:nth-child("+columnIndex+"), th:nth-child("+columnIndex+")").style("display", show ? null : "none");
	}
	
	function hideColumns () {
		// hide columns that are hid by default
		selection.datum().headerEntries.forEach (function (d, i) {
			if (!d.value.visible) {
				displayColumn (i + 1, false);
			}
		});
	}
	
	my.update = function () {
		var pageData = filteredData.slice ((page - 1) * pageSize, page * pageSize);
		var ko = this.columnOrder();
		var modifiers = this.dataToHTMLModifiers();
		
		var rows = selection.select("tbody").selectAll("tr").data(pageData);
		rows.exit().remove();
		rows.enter().append("tr");
		
		var cells = rows.selectAll("td").data (function (d) { return ko.map (function (k) { return {key: k, value: d}; }); });
		
		cells.enter().append("td");
		
		cells
			.html (function(d) { return modifiers[d.key] ? modifiers[d.key](d.value) : d.value[d.key]; })
			.attr ("class", function(d) { return cellStyles[d.key]; })
			.filter (function(d) { return tooltips[d.key]; })
			.attr ("title", function(d) {
				var v = tooltips[d.key](d);
				return v ? d.value.id+": "+v : "";
			})
		;	
		
		hideColumns();
		
		if (this.postUpdateFunc()) {
			this.postUpdateFunc()(rows);
		}
	};
	
	my.columnOrder = function (value) {
		if (!arguments.length) { return columnOrder; }
		columnOrder = value;
		return my;
	};
	
	my.dataToHTMLModifiers = function (value) {
		if (!arguments.length) { return dataToHTMLModifiers; }
		dataToHTMLModifiers = value;
		return my;
	};
	
	my.filter = function (value) {
		if (!arguments.length) { return filter; }
		filter = value;
		var ko = this.columnOrder();
		
		filteredData = data.filter (function (rowdata) {
			var pass = true;
			for (var n = 0; n < ko.length; n++) {
				var key = ko[n];
				if (filter[key] && rowdata[key].search(filter[key]) < 0) {
					pass = false;
					break;
				}
			}
			return pass;
		});
		
		this.sort();
		
		doPageCount();
		selection.selectAll(".pageTotal").text(pageCount);
		my.page(1);
		
		// update filter inputs with new filters
		var filterCells = selection.select("thead tr:nth-child(2)").selectAll("th");
		filterCells.select("input").property("value", function (d) {
			return filter[d.key];	
		});
		
		var filter2 = selection.datum().headerEntries.map (function (hentry) {
			return {value: filter[hentry.key]};
		});
		dispatch.filtering (filter2);
		
		return my;
	};
	
	my.sort = function () {
		var orderKey = my.orderKey();
		var orderDir = my.orderDir();
		
		if (orderDir !== "none") {
			var mult = (orderDir === "asc" ? 1 : -1);
			filteredData.sort (function (a, b) {
				var aval = a[orderKey];
				var bval = b[orderKey];
				if (aval === undefined) {
					return (bval === undefined ? 0 : -mult);
				}
				else {
					return (bval === undefined ? mult : mult * (aval.localeCompare (bval)));
				}
			});
		}
		
		return my;
	};
	
	my.orderKey = function (value) {
		if (!arguments.length) { return orderKey; }
		if (value !== orderKey) {
			orderKey = value;
			orderDir = "asc";
		} else {
			var index = orderDirs.indexOf(orderDir);
			orderDir = orderDirs[(index + 1) % orderDirs.length];
		}
		
		dispatch.ordering (my.getColumnIndex(orderKey), orderDir === "desc");
		dispatch.ordering2 (orderKey);
		
		return my;
	};
	
	my.orderDir = function (value) {
		if (!arguments.length) { return orderDir; }
		if (orderDirs.indexOf (orderDir) >= 0) {
			orderDir = value;
		}
		
		dispatch.ordering (my.getColumnIndex(orderKey), orderDir === "desc");
		dispatch.ordering2 (orderKey);
		
		return my;
	}
	
	my.page = function (value) {
		if (!arguments.length) { return page; }
		page = value;
		
		dispatch.pageNumbering (page);
		
		return my;
	};
	
	my.pageSize = function (value) {
		if (!arguments.length) { return pageSize; }
		pageSize = value;
		doPageCount();
		return my;
	};
	
	my.postUpdateFunc = function (value) {
		if (!arguments.length) { return postUpdateFunc; }
		postUpdateFunc = value;
		return my;
	};
	
	my.getColumnIndex = function (key) {
		return my.columnOrder().indexOf(key);	
	};
	
	my.dispatch = function (value) {
		if (!arguments.length) { return dispatch; }
		dispatch = value;
		return my;
	};
	
	return my;
};