/*
  MODULE: loop
  
*/

Player.provide('loop',{
    
},function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);
    var _prevShow = false;

    var _onRender = function(){
        $this.loopContainer = $this.container.find(".loop-container");
        $this.loopThumbnail = $this.loopContainer.find(".loop-thumbnail");
        $this.countDown = $this.loopContainer.find(".loop-countdown");
        $this.countDown.click($this.cancelCountdown);
        Player.set("showLoop", false);
        _resize();
    };

    var _resize = function(){
        var $window = $(window);
        if(!$this.loopThumbnail) return;
        var image = $this.loopThumbnail.get(0);
        if(!image.complete) { return $this.loopThumbnail.load(_resize); }
        
        var wr = $window.width() / $window.height();
        var ir = image.naturalWidth / image.naturalHeight;
        if(ir > wr){
            $this.loopThumbnail.css({
                top: (50/wr - 50/ir) + "%",
                left: 0,
                width: "100%",
                height: ""
            });
        }else{
            $this.loopThumbnail.css({
                top: 0,
                left: (50 - ir*50/wr) + "%",
                width: "",
                height: "100%"
            });
        }
    };
    $(window).resize(_resize);

    var _countdownTimeouts = [];
    $this.countFrom = function(timeLeft){
        while(_countdownTimeouts.length > 0){
            clearTimeout(_countdownTimeouts.pop());
        }
        if(timeLeft > 0){
            $this.countDown.text(timeLeft + (timeLeft != 1 ? " seconds" : " second"));
            _countdownTimeouts.push(
                setTimeout((function(tl){
                    return function(){
                        $this.countFrom(tl);
                    };
                })(timeLeft-1), 1000)
            );
        }else{
            Player.set("playLoopVideo");
        }
    };
    $this.initCountdown = function(){
        $this.countDown.addClass("loop-countdown-animating");
        $this.countFrom(10);
    };
    $this.cancelCountdown = function(){
        $this.countDown.removeClass("loop-countdown-animating");
        while(_countdownTimeouts.length > 0){
            clearTimeout(_countdownTimeouts.pop());
        }
    };
    $this.buildLoop = function(){
        var nextVideo = Player.get("nextVideo");
        if(!nextVideo) return;
        var backgroundUrl = [
            Player.get("url"),
            nextVideo.tree_id,
            nextVideo.photo_id,
            nextVideo.token,
            "800x/thumbnail.jpg"
        ].join("/");
        var context = {
            loopVideo: nextVideo,
            backgroundUrl: backgroundUrl
        };
        $this.render(_onRender, null, null, context);
    };
    
    var _loopTimeouts = [];
    Player.setter('showLoop', function(show){
        $this.showLoop = show;
        if($this.showLoop){
            $this.showLoop = !Player.fire("player:module:overlayactivated", {name: "loop", prevented: false}).prevented;
        }
        if($this.showLoop != _prevShow){
            while(_loopTimeouts.length > 0){
                clearTimeout(_loopTimeouts.pop());
            }
            Player.set("forcer", {type: "persist", element: "tray", from: "loop", active: $this.showLoop});
            Player.set("forcer", {type: "block", element: "big-play", from: "loop", active: $this.showLoop});
            $this.container.find(".loop-container").show();
            _loopTimeouts.push(setTimeout(function(){
                $this.container.find(".loop-container").toggleClass("loop-container-activated", $this.showLoop);
            }, 10));
            _loopTimeouts.push(setTimeout(function(){
                $this.container.find(".loop-container").css({display: ""});
                $("body").toggleClass("overlay-shown", $this.showLoop);
            }, 210));
            _prevShow = $this.showLoop;
            if($this.showLoop){
                $this.initCountdown();
            }else{
                $this.cancelCountdown();
            }
        }
    });
    Player.setter("playLoopVideo", function(){
        Player.set("video_photo_id", Player.get("nextVideo").photo_id);
        Player.set("currentTime", 0);
        Player.set("playing", true);
    });

    Player.bind("player:module:overlayactivated", function(e, info){
        if(info.name != "loop"){
            Player.set("showLoop", false);
        }
        return info;
    });
    Player.bind("player:video:loaded player:browse:updated player:video:play", function(){
        $this.buildLoop();
    });
    
    return $this;
});
