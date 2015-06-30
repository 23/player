// Helper class managing the playback of a list of video and ad actions
window.VideoActionHandler = function(actions, container, module, callback){

    var $this = this;
    $this.currentActionIndex = -1;
    $this.vastHandler = new window.VastHandler($this);

    if(actions.length < 1){
        return callback();
    }

    $this.eingebaut = Player.get("videoElement");

    $this.insertAction = function(action){
        actions.splice($this.currentActionIndex+1, 0, action);
    };

    $this.playNextAction = function(){

        $this.eingebaut.setPlaying(false);

        $this.currentActionIndex += 1;
        $this.currentAction = actions[$this.currentActionIndex];

        $("body").addClass("video-action-playing");

        if($this.currentActionIndex >= actions.length){
            $this.eingebaut.restoreContext();
            $("body").removeClass("video-action-playing");
            // IE 9 and 10 does not display the video container correctly when z-index is changed
            // This forces a repaint
            if( /MSIE (9|10)/.test(navigator.userAgent) ) {
                $this.eingebaut.container.parent().hide(0,function(){$(this).show();});
            }
            container.parent().hide();
            Player.set("slideModeDisabled", false);
            return callback();
        }

        // Move on to next action if this is not a video action
        if($this.currentAction.type != "video" && $this.currentAction.type != "ad"){
            return $this.playNextAction();
        }

        if($this.currentAction.type == "ad"){
            if(!$this.currentAction.adLoaded || typeof $this.currentAction.pendingData != "undefined"){
                return $this.vastHandler.initAd($this.currentAction, function(success){
                    if(success){
                        $this.currentAction.adLoaded = true;
                        $this.currentActionIndex -= 1;
                    }
                    $this.playNextAction();
                });
            }else{
                $this.currentAction.adLoaded = false;
            }
        }

        // Make sure the source property is an absolute path
        if( !/^https?:\/\//.test($this.currentAction.video) ){
            $this.currentAction.video = Player.get("url") + $this.currentAction.video;
        }

        Player.set("slideModeDisabled", true);

        $this.eingebaut.setContext({
            source: $this.currentAction.video,
            startTime: 0,
            callback: $this.videoCallback,
            displayDevice: (!$this.eingebaut.canPlayType("video/mp4")?"flash":undefined)
        });
        $this.eingebaut.setPlaying(true);

    };

    $this.videoCallback = function(event){
        if(!$this.currentAction) return;
        Player.fire("player:action:"+event);
        if($this.currentAction.type=="ad" && $this.vastHandler.eventHandlers[event]) $this.vastHandler.eventHandlers[event]();
        if(event=="ended" || event=="error"){
            if($this.currentAction.type=="ad") $this.currentAction.adLoaded = false;
            $this.playNextAction();
        }else if(event=="timeupdate"){
            $this.renderCountdown();
        }
    };

    $this.renderCountdown = function(){
        module.render(function(){}, 'actions/actions-video.liquid', container);
    };
    $this.hasLink = function(){
        return typeof($this.currentAction.link) != "undefined";
    };
    $this.actionClick = function(){
        if(typeof $this.currentAction.link != 'undefined' && $this.currentAction.link != ""){
            if(!$this.currentAction.clicked) {
                Player.fire("player:action:click", $this.currentAction);
                window.open($this.currentAction.link, (typeof $this.currentAction.link_target != "undefined" ? $this.currentAction.link_target : "_blank"));
                if($this.currentAction.type=="ad") $this.vastHandler.eventHandlers["click"]();
                Player.set("playing", false);
                $this.currentAction.clicked = true;
            }else{
                Player.set("playing", true);
                $this.currentAction.clicked = false;
            }
        }
    };
    $this.skipAction = function(){
        Player.set("playing", false);
        if($this.currentAction.type=="ad") $this.vastHandler.eventHandlers["close"]();
        $this.playNextAction();
    };

    $this.playNextAction();

};
