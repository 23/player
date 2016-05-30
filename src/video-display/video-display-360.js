(function($, window, Player){
    
    var _loadAframe = function(callback){
        $.ajax({
            url: "//aframe.io/releases/0.2.0/aframe.min.js",
            dataType: "script"
        });
        var checkAframeLoaded = function(){
            if(typeof AFRAME == "undefined"){
                window.setTimeout(checkAframeLoaded, 500);
            }else{
                callback();
            }
        };
        checkAframeLoaded();
    };
    
    var _display360 = function(callback){
        console.log("localhost");
        if(typeof AFRAME == "undefined"){
            _loadAframe(function(){
                _activate360(callback);
            });
        }else{
            _activate360(callback);
        }
    };
    
    var _activate360 = function(callback){
        var scene = $("<div></div>");
        Player.modules[0].render(function(){
            
            var ve = Player.get("videoElement");
            ve.video.attr({
                "id": "videoElement",
                "preload": "none",
                "crossorigin": "anonymous"
            }).prop({
                "webkit-playsinline": true,
                "autoplay": false
            }).get(0).load();
            
            scene.find("a-assets").append(ve.video);
            ve.container.append(scene);
            
            window.setTimeout(callback, 500);
            
        }, "video-display/video-display-360.liquid", scene.get(0));
        
    }
    
    window.display360 = _display360;
    
})(jQuery, window, Player);
