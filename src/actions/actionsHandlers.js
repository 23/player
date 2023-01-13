var registerActionHandlers = function($this){
    // HANDLERS FOR ACTION TYPES
    // HANDLER: TEXT
    $this.showHandlers['text'] = function(action){
        // TODO: Make sure text scales well in text and html boxes
        var parentFontSize = action.font_size || 11;
        action.parent.css({"font-size": parentFontSize+'px'});
        action.text = action.text.replace(/\n/g, '<br />');
        var table = $("<table><tr><td></td></tr></table>");
        var cell = table.find("td");
        cell.append(action.text);
        if(action.valign&&action.valign!="top"){
            cell.css({
                "vertical-align": (action.valign=="center"?"middle":action.valign)
            })
        }
        if(action.halign&&action.halign!="left"){
            cell.css({
                "text-align": action.halign
            })
        }
        action.container.html(table);
        $this._resize();
    }
    // HANDLER: HTML
    $this.showHandlers['html'] = function(action){
        action.container.html(action.html);
    }
    // HANDLER: IMAGE
    $this.showHandlers['image'] = function(action){
        // Create image element and a table to display it in
        var img = $(document.createElement('img'));
        img.attr({ "crossorigin": "anonymous" });
        var table = $("<table><tr><td></td></tr></table>");
        var cell = table.find("td");
        // Set alignments of cell content
        if(action.valign && action.valign != "center"){
            cell.css({"vertical-align": action.valign});
        }
        if(action.halign && action.halign != "center"){
            cell.css({"text-align": action.halign});
        }
        cell.append(img);
        if(action.type == "banner"){
            cell.wrapInner("<span class='banner-wrap'></span>");
            if(typeof action.link != "undefined" && action.link != ""){
                var a = $("<a />").addClass("action-screen").attr({"href": action.link, "target": "_new"}).click(function(){
                    Player.fire("player:action:click", action);
                });
                cell.find(".banner-wrap").append(a);
            }
            if($this.identityAllowClose){
                $("<div class='close-button'></div>").click(function(){
                    action.container.remove();
                    $this.vastHandler.reportEvent("close", false);
                    $this.vastHandler.reportEvent("collapse", false);
                }).appendTo(cell.find(".banner-wrap"));
            }
        }
        action.container.append(table);
        action.image = (/https?:\/\//.test(action.image)?action.image:Player.get("url")+action.image);
        img.load(function(){
            // When image is loaded, save the original dimensions for use when scaling
            action.image_width = img.get(0).clientWidth;
            action.image_height = img.get(0).clientHeight;
            action.aspect_ratio = action.image_width / action.image_height;
            if(action.aspect_ratio>action.container.get(0).clientWidth/action.container.get(0).clientHeight){
                img.css({
                    width: action.container.get(0).clientWidth,
                    height: "auto",
                    visibility: "visible"
                });
            }else{
                img.css({
                    width: "auto",
                    height: action.container.get(0).clientHeight,
                    visibility: "visible"
                });
            }
        }).attr('src', action.image);
    }

    // HANDLER: AD & VIDEO
    $this.startTimeHandled = false;
    $this.showHandlers['ad'] = $this.showHandlers['video'] = function(action){
        var actions = $this.getOverlappingActions(action);
        $this.videoActionHandler = new window.VideoActionHandler(actions, action.container, $this, function(){
            Player.fire( action.normalizedStartTime == -1 ? "player:action:prerollsplayed" : "player:action:postrollsplayed" );
        });
        return false;
    };

    // HANDLER: BANNER
    // This handler mimics the showHandler for action type "image" exept it makes sure that the VAST feed
    // has been loaded and parsed, before creating the image element and its container
    $this.showHandlers['banner'] = function(action){
        if(typeof action.ad_url=="undefined"||action.ad_url=="") return;
        $this.vastHandler = new window.VastHandler();
        $this.vastHandler.initAd(action, function(success){
            if(!success) return;
            $this.vastHandler.reportEvent("impression");
            $this.vastHandler.reportEvent("creativeView");
            $this.showHandlers['image'](action);
        });
    };

    // HANDLER: PRODUCT
    $this.showHandlers['product'] = function(action){
        // All product actions are placed inside the same parent element to allow stacking
        // Create the parent element, if it does not already exist
        var productParent = $(".product-parent");
        if(productParent.length<1){
            productParent = $("<div></div>").addClass("product-parent").appendTo($this.container);
        }
        // Place product image inside the action container
        if(typeof action.image!='undefined' && action.image!=''){
            var img = $(document.createElement('img')).attr({ "crossorigin": "anonymous", "src": Player.get("url") + action.image });
            img.appendTo(action.container);
        }
        // Append product name and description
        if(typeof action.product_name!='undefined' && action.product_name!=''){
            var productName = $("<table><tr><td><div class='product-wrap'></div></td></tr></table>").addClass("product-info").appendTo(action.container);
            var wrap = productName.find(".product-wrap");
            wrap.append( $("<span></span>").addClass("product-name").html(action.product_name) );
            if(typeof action.product_text!='undefined' && action.product_text!='') {
                wrap.append("<br />");
                wrap.append( $("<span></span>").addClass("product-description").html(action.product_text) );
            }
            $("<div></div>").addClass("product-triangle").appendTo(action.container);
        }
        action.parent.appendTo(productParent).css({"display":"none"});
        action.parent.slideDown(200);
    };
    $this.hideHandlers['product'] = function(action){
        // Hide the acition with an animation
        action.parent.stop().slideUp(200, function(){
            // Remove the action completely
            $(this).remove();
            // Remove the parent element, if it is empty
            var productParent = $(".product-parent");
            if(productParent.find(".action").length<1){
                productParent.remove();
            }
            delete $this.activeActions[action.action_id];
            delete action.container;
            delete action.parent;
        });
        // Return true, so the dispatcher knows that this hideHandler is in charge of removing
        // the action and its containers
        return true;
    };
};
