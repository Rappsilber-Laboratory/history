var CLMSUI = CLMSUI || {};

CLMSUI.jqdialogs = {
    constructDialogMessage: function (dialogID, msg, title) {
        var dialog = d3.select("body").select("#"+dialogID);
        if (dialog.empty()) {
            dialog = d3.select("body").append("div").attr("id", dialogID);
        }
        dialog.selectAll("p").remove();
        dialog
            .attr("id", dialogID)
            .attr("title", title)
            .selectAll("p")
            .data(msg.split("<br>"))
            .enter()
                .append("p")
                .html (function(d) { return d; })
        ;
    },
    
    errorDialog: function (dialogID, msg, title) {
        msg = msg.concat("<br><A href='https://github.com/Rappsilber-Laboratory/' target='_blank'>Rappsilber Lab GitHub</A>");
        CLMSUI.jqdialogs.constructDialogMessage (dialogID, msg, title || "Database Error");

        return $("#"+dialogID).dialog({
            modal:true,
        });
    },
    
    waitDialog: function (dialogID, msg, title) {
        CLMSUI.jqdialogs.constructDialogMessage (dialogID, "", title);
           
        $("#"+dialogID).dialog({
            modal: true,
            dialogClass: "no-close",
            open: function () {
                $('.ui-dialog :button').blur(); // http://stackoverflow.com/questions/1793592/jquery-ui-dialog-button-focus
            },
        }); 
        
        d3.select("#"+dialogID).append("div")
            .attr ("id", dialogID+"progress")
            .append ("div")
                .attr("class", "progressLabel")
                .text (msg)
        ;
        
        return $("#"+dialogID+"progress").progressbar({"value": false});
    },
    
    killWaitDialog: function (waitDialogID) {
        var pbar = $("#"+waitDialogID+"progress");
        pbar.progressbar("destroy");
        $("#"+waitDialogID).dialog("destroy");
        d3.select("#"+waitDialogID).remove();    
    },
    
    areYouSureDialog: function (dialogID, msg, title, yesText, noText, yesFunc) {
        CLMSUI.jqdialogs.constructDialogMessage (dialogID, msg, title || "Confirm");
        
        function hardClose () {
             $(this).dialog("close").dialog("destroy").remove();
        }
        
        function yesAndHardClose () {
            hardClose.call (this);  // need to do it this way to pass on 'this' context
            yesFunc();
        }

        return $("#"+dialogID).dialog({
            modal: true,
            open: function () {
                $('.ui-dialog :button').blur(); // http://stackoverflow.com/questions/1793592/jquery-ui-dialog-button-focus
            },
            buttons: [
                { text: yesText, click: yesAndHardClose },
                { text: noText, click: hardClose }
            ]
        });
    }, 
    
    choicesDialog: function (dialogID, msg, title, choices, links, clickFunc) {
        CLMSUI.jqdialogs.constructDialogMessage (dialogID, msg, title || "Confirm");
        
        var redirect = function (link) {
            var dialog = $("#"+dialogID)[0];
            hardClose.call(dialog);
            if (clickFunc) {
                clickFunc (link);
            } else {
                window.open (link, '_blank');
            }
        };
        
        function hardClose () {
             $(this).dialog("close").dialog("destroy").remove();
        }
        
        var buttons = choices.map (function (choice, i) {
            return {text: choice, click: function() { redirect (links[i]); } };
        }, this);
        buttons.push ({text: "Cancel", click: hardClose});
        
        return $("#"+dialogID).dialog({
            modal: true,
            open: function () {
                $('.ui-dialog :button').blur(); // http://stackoverflow.com/questions/1793592/jquery-ui-dialog-button-focus
            },
            buttons: buttons,
            title: title,
        });
    }
};

