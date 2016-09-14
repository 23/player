var ThreeSixtyController = (function(){
    var module, $videoElement, $container;
    var $sceneContainer = $("<div></div>").addClass("scene-360");
    var $videoSphere = null;
    var $camera = null;
    var _rotationComponent = null;
    var scene = null;
    var inited = false, displaying360 = false;
    var _callback = function(){};
    var _rotation = {
      x: 0,
      y: 0,
      z: 0
    };

    var _onSceneRendered = function(){
        scene = $sceneContainer.find("a-scene").get(0);
        scene.addEventListener("renderstart", function(){
          _callback();
        });
        var $assets = $sceneContainer.find("a-assets");
        $videoElement.attr({
          "id": "videoElement",
          "crossorigin": "anonymous",
          "autoplay": "1"
        });
        $assets.prepend($videoElement);
        $videoSphere = $("<a-videosphere src='#videoElement' radius='10000' position='0 0 0'></a-videosphere>");
        $camera = $sceneContainer.find("#camera");
        $(scene).append($videoSphere);
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
            url: "//aframe.io/releases/0.3.0/aframe.min.js",
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

    var _getRotationComponent = function(){
        return $camera.get(0).components["look-controls"];
    };
    var _setRotation = function(rotation){
        if(!_rotationComponent) { _rotationComponent = _getRotationComponent(); }
        if(typeof rotation.x != "undefined"){
            rotation.x = Math.max(-90, Math.min(90, rotation.x));
            _rotationComponent.pitchObject.rotation.x = THREE.Math.degToRad(rotation.x);;
        }
        if(typeof rotation.y != "undefined"){
            rotation.y = rotation.y % 360;
            _rotationComponent.yawObject.rotation.y = THREE.Math.degToRad(rotation.y);;
        }
    };
    var _setRotationDelta = function(rotation){
        if(!_rotationComponent) { _rotationComponent = _getRotationComponent(); }
        var newRotation = {
            x: THREE.Math.radToDeg(_rotationComponent.pitchObject.rotation.x),
            y: THREE.Math.radToDeg(_rotationComponent.yawObject.rotation.y)
        };
        if(typeof rotation["x"] != "undefined") { newRotation["x"] += parseInt(rotation["x"], 10); }
        if(typeof rotation["y"] != "undefined") { newRotation["y"] += parseInt(rotation["y"], 10); }
        _setRotation(newRotation);
    };
    var _setRotationAnimated = function(newRotation, duration){
      if(!_rotationComponent) { _rotationComponent = _getRotationComponent(); }
      var currentRotation = {
            x: THREE.Math.radToDeg(_rotationComponent.pitchObject.rotation.x),
            y: THREE.Math.radToDeg(_rotationComponent.yawObject.rotation.y)
      };
      // Calculate smallest delta to y rotation
      var delta = (newRotation.y % 360) - (currentRotation.y % 360);
      if (Math.abs(delta) > 180) {
        delta = (delta > 0 ? delta - 360 : delta + 360);
      }
      newRotation.y = currentRotation.y + delta;
      // Animate changes to the rotation
      $(currentRotation).animate(newRotation, {
        step: function(value,info){
          var rotation = {};
          rotation[info.prop] = value;
          _setRotation(rotation);
        },
        duration: duration
      });
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
      return (scene.states.indexOf("vr-mode") != -1);
    };

    var _enter360 = function(){
        Player.set("shortcutsDisabled", true);
        if(inited && !displaying360){
            _renderScene();
            displaying360 = true;
	    $("body").addClass("displaying-360");
        }
    };

    var _leave360 = function(){
        Player.set("shortcutsDisabled", false);
        if(inited && displaying360){
            $container.prepend($videoElement);
            $videoElement.removeProp("controls");
            $videoSphere.remove();
            displaying360 = false;
	    $("body").removeClass("displaying-360");
        }
    };

    var _init = function(m, ve, c, callback){
        if(!inited){
            _callback = callback;
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
            module = $videoElement = $container = scene = _rotationComponent = null;
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
        setRotation: _setRotation,
        setRotationDelta: _setRotationDelta,
        setRotationAnimated: _setRotationAnimated,
        enterVR: _enterVR,
        exitVR: _exitVR,
        toggleVR: _toggleVR,
        isInVR: _isInVR,
        displaying360: _displaying360
    };
})();
