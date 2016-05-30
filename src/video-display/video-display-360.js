(function($, window, Player){

    var _videoElement = function() {
        return Player.get("videoElement");
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


    window.display360 = _display360;

})(jQuery, window, Player);
