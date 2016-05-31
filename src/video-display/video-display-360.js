(function($, window, Player){

    var _videoElement = function() {
        return Player.get("videoElement");
    }

    var _sceneElement = function() {
        return _videoElement().container.find('a-scene');
    }

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

            _videoElement().video.attr({
                "id": "videoElement",
                "preload": "none",
                "crossorigin": "anonymous"
            }).prop({
                "webkit-playsinline": true,
                "autoplay": false
            }).get(0).load();

            var elmAssets = scene.find("a-assets");
            elmAssets.append(_videoElement().video);
            elmAssets.append(_build360ThumbnailAsset());
            _videoElement().container.append(scene);
            _videoElement().video.bind("play", _playing360);
            _playVideoOnEnterVR();
            _togglePlayOnCanvasClick();
            _bindActions();

            window.setTimeout(callback, 500);

        }, "video-display/video-display-360.liquid", scene.get(0));

    }

    var _build360ThumbnailAsset = function() {
     var elmAsset = $('<img />');
      elmAsset.attr({
        src: _getHDPoster,
        id: "thumbnailElement"
      });
      return elmAsset;
    }

    var _getHDPoster = function() {
     var poster = _videoElement().getPoster();
      return poster.replace("large", "1920x1080cr");
    }

    var _playing360 = function() {
     _videoElement().container.find('a-sky').attr('visible', false);
     _videoElement().container.find('a-videosphere').attr('visible', true);
    }

    var _playVideoOnEnterVR = function() {
        _sceneElement.bind('enter-vr', function() {
            Player.set('playing', true);
        });
    }

    var _togglePlayOnCanvasClick = function() {
     _videoElement().container.bind("click", function() {
        if (Player.get("playing")) {
            Player.set("playing", false);
        } else {
            Player.set("playing", true);
        }
     });
    }

    var _bindActions = function() {
        Player.bind("player:action:activated", _showAction);
        Player.bind("player:action:deactivated", _hideAction);
    }

    var _showAction = function(e, action) {
        console.log("_showAction", e, action);
        switch(action.type) {
            case 'image':
                _showImageAction(action);
                break;
        }
    }

    var _hideAction = function(e, action) {
        $('[action-id=' + action.action_id + ']').remove();
    }

    _showImageAction = function(action) {
        var width = action.width*10;
        var height = action.height*10;
        var elmImage = $('<a-image src="' + action.image + '" width="' + width + '" height="' + height + '" action-id="' + action.action_id + '"></a-image>');
        _sceneElement().append(elmImage);
    }

    window.display360 = _display360;

})(jQuery, window, Player);
