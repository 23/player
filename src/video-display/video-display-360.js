var ThreeSixtyController = (function(){
    var module, $videoElement, $container;
    var $sceneContainer = $("<div></div>").addClass("scene-360");
    var $videoSphere = $("<span/>");
    var scene = null;
    var inited = false, displaying360 = false;

    var _onSceneRendered = function(){
        scene = $sceneContainer.find("a-scene").get(0);
        var $assets = $sceneContainer.find("a-assets");
        $videoElement.attr({
            "id": "videoElement"
        });
        $assets.prepend($videoElement);
        $videoSphere = $("<a-videosphere src='#videoElement' rotation='0 270 0'></a-videosphere>");
        $(scene).append($videoSphere);
        $videoElement.get(0).pause();
    };

    var _renderScene = function(){
        if(!scene){
            $container.append($sceneContainer);
            module.render(_onSceneRendered, "video-display/video-display-360.liquid", $sceneContainer);
        }else{
            _onSceneRendered();
        }
    };
    
    var _loadAframe = function(callback){
        if(typeof AFRAME != "undefined") return callback();
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

    var _enterVR = function(){
        scene.enterVR();
    };
    var _exitVR = function(){
        scene.exitVR();
    };
    var _toggleVR = function(){
        if(_isInVR()){
            _exitVR();
        }else{
            _enterVR();
        }
    };
    var _isInVR = function(){
        return scene.renderer == scene.stereoRenderer;
    };

    var _enter360 = function(){
        if(inited && !displaying360){
            _renderScene();
            displaying360 = true;
	    $("body").addClass("displaying-360");
        }
    };

    var _leave360 = function(){
        if(inited && displaying360){
            $container.prepend($videoElement);
            $videoElement.removeProp("controls");
            $videoSphere.remove();
            displaying360 = false;
	    $("body").removeClass("displaying-360");
        }
    };

    var _init = function(m, ve, c){
        if(!inited){
            module = m;
            $videoElement = ve;
            $videoElement.get(0).load();
            $container = c;
            _loadAframe(function(){
                inited = true;
                _enter360();
            });
        }
    };

    var _destroy = function(){
        if(inited){
            _leave360();
            module = $videoElement = $container = scene = null;
            inited = false;
        }
    };

    var _displaying360 = function() {
        return displaying360;
    }

    return {
        init: _init,
        destroy: _destroy,
        render360: _enter360,
        leave360: _leave360,
        enterVR: _enterVR,
        exitVR: _exitVR,
        toggleVR: _toggleVR,
        isInVR: _isInVR,
        displaying360: _displaying360
    };
})();
