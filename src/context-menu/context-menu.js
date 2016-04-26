/*
 MODULE: context-menu

 */

Player.provide('context-menu',{

},function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);

    $this.showMenu = false;
    $this.showLinkBox = false;
    $this.menuTop = 0;
    $this.menuLeft = 0;

    $this.linkBoxValue = Player.get("embedCode");

    /* GETTERS */
    Player.getter('showMenu', function(){ return $this.showMenu; });
    Player.getter('showLinkBox', function(){return $this.showLinkBox;});
    Player.getter('menuTop', function(){ return $this.menuTop; });
    Player.getter('menuLeft', function(){ return $this.menuLeft; });
    Player.getter('linkBoxValue', function(){return $this.linkBoxValue;});
    Player.getter('debugParameters', function(){
        var current_id = Player.get("video").type == "clip" ? Player.get("video_photo_id") : Player.get("video_live_id");
        var current_token = Player.get("video_token");
        var paramString = "current_id="+current_id+"&current_token="+current_token;
        $.each(Player.settings, function(key, value){
            paramString += "&" + key + "=" + value;
        });
        return paramString;
    });
    Player.getter('advancedContextMenu', function(){return $this.advancedContextMenu;});


    /* SETTERS */
    Player.setter('showMenu', function(e){
        $this.showMenu = !!e;
        if($this.showMenu){
            $this.advancedContextMenu = e.altKey;
            $this.showLinkBox = false;
            $this.menuLeft = e.pageX;
            if($this.menuLeft + 182 > $(window).width()){
                $this.menuLeft = e.pageX - 182;
            }
            $this.menuTop = e.pageY;
            if($this.menuTop + 185 > $(window).height()){
                $this.menuTop = Math.max(2, e.pageY - 185);
            }
        }
        $this.render(function(){
          $this.container.find(".link-box input").select();
        });
    });
    Player.setter('linkBoxValue', function(type){
        switch(type){
        case "url":
            $this.linkBoxValue = Player.get("videoLink");
            break;
        case "url-time":
            Player.set("playing", false);
            $this.linkBoxValue = Player.get("videoLink") + "?start=" + Math.round(Player.get("currentTime"));
            break;
        case "embed":
            $this.linkBoxValue = Player.get("embedCode");
            break;
        case "embed-time":
            Player.set("playing", false);
            var embed = $(Player.get("embedCode"));
            var iframe = embed[0].tagName == "DIV" ? embed.find("iframe") : embed;
            iframe.attr("src", iframe.attr("src") + "&start=" + Math.round(Player.get("currentTime")));
            $this.linkBoxValue = embed[0].outerHTML;
            break;
        case "object-id":
            $this.linkBoxValue = (Player.get("video_type") == "clip" ? Player.get("video_photo_id") : Player.get("video_live_id"));
            break;
        case "object-token":
            $this.linkBoxValue = Player.get("video_token");
            break;
        case "source-link":
            $this.linkBoxValue = Player.get("qualities")[Player.get("quality")].source;
            break;
        }
        $this.showLinkBox = true;
        $this.render();
    });
    Player.setter('logVideoObject', function(value){
        console.log(Player.get("video"));
    });


    $(document).on("contextmenu", function(e) {
        // If shift is pressed, display the browser's own context menu
        if(!e.shiftKey){
            e.preventDefault();
            Player.set('showMenu', e);
        }
    });
    $this.container.on("click", ".menu-background", function(e){
        if($this.showMenu){
            Player.set('showMenu', false);
            e.preventDefault();
        }
    });

    return $this;
});

Player.translate("share_this_video",{
    en: "Share this video"
});
Player.translate("share_this_event",{
    en: "Share this event"
});
Player.translate("close",{
    en: "Close"
});
Player.translate("get_video_url",{
    en: "Get video url"
});
Player.translate("get_event_url",{
    en: "Get event url"
});
Player.translate("get_video_url_at_current",{
    en: "Get video url at current time"
});
Player.translate("get_embed_code",{
    en: "Get embed code"
});
Player.translate("get_embed_code_at_current",{
    en: "Get embed code at current time"
});
Player.translate("open_in_admin",{
    en: "Open in administration"
});
Player.translate("get_id",{
    en: "Get id"
});
Player.translate("get_token",{
    en: "Get token"
});
Player.translate("get_link_to_source",{
    en: "Get link to source"
});
Player.translate("log_video_object",{
    en: "Log video object to console"
});
Player.translate("debug_information",{
    en: "Debug information"
});
Player.translate("help_center",{
    en: "Help center"
});
Player.translate("twentythree_players",{
    en: "TwentyThree video players"
});
Player.translate("about_twentythree",{
    en: "About TwentyThree"
});
