(function($, window, Player){

    // Keeps track of whether the player is in "cardboard/vr mode" or not
    var _isInVR = false;

    var _videoElement = function() {
        return Player.get("videoElement");
    }

    var _sceneElement = function() {
        return _videoElement().container.find('a-scene');
    }

    var _playerElement = function() {
        return $('#player');
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

            _apply360Class();
            var elmAssets = scene.find("a-assets");
            elmAssets.append(_videoElement().video);
            elmAssets.append(_build360ThumbnailAsset());
            _videoElement().container.append(scene);
            _videoElement().video.bind("play", _onPlayStart);
            _bindEnterExitVR();
            _bind3DActions();

            window.setTimeout(callback, 500);

        }, "video-display/video-display-360.liquid", scene.get(0));

    }

    // Adds a "video-360" class to the #player element, for use in styling
    var _apply360Class = function() {
        _playerElement().addClass('video-360');
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

    // Hide 360 thumbnail and show 360 video when video is played
    var _onPlayStart = function() {
     _videoElement().container.find('a-sky').attr('visible', false);
     _videoElement().container.find('a-videosphere').attr('visible', true);

     // TEMP: Fake VR mode for desktop development - DO NOT COMMIT
     _create3DAction(null, { color: 'red', x: 0.5, y: 0.5, width: 0.05, height: 0.05, type: 'testcube' });
     _create3DAction(null, { color: 'green', x: 1, y: 0.5, width: 0.05, height: 0.05, type: 'testcube' });
     //_create3DAction(null, { color: 'blue', x: 0.5, y: 0, width: 0.05, height: 0.05, type: 'testcube' });
     //_create3DAction(null, { color: 'yellow', x: 0.75, y: 0.5, width: 0.05, height: 0.05, type: 'testcube' });
     //_create3DAction(null, { color: 'purple', x: 0.25, y: 0.5, width: 0.05, height: 0.05, type: 'testcube' });
     _onEnterVR();
    }

    // Monitors for switches between "desktop mode" and "VR mode"
    var _bindEnterExitVR = function() {
        _sceneElement().bind('enter-vr', _onEnterVR);
        _sceneElement().bind('exit-vr', _onExitVR);
    }

    var _onEnterVR = function() {
        _isInVR = true;

        // Apply is-in-vr class to player to allow for conditional styling
        _playerElement().addClass('is-in-vr');

        // Show supported actions as VR entities
        _showAll3DActions();

        // Let video by toggled by canvas click, but wait a bit to not react to the current click
        window.setTimeout(function() {
            // TODO: Incomment this back in before commit - DO NOT COMMIT
            //_videoElement().container.bind("click", _togglePlay);
        }, 10);
    }

    var _onExitVR = function() {
        _isInVR = false;

        // Remove is-in-vr class on player
        _playerElement().removeClass('is-in-vr');

        // Hide any VR actions, as they are in the regular player-actions overlay in 2D mode
        _hideAll3DActions();

        // Unbind listener that stops/starts play on entire canvas click
        _videoElement().container.unbind("click", _togglePlay);
    }

    // Start/pause video
    var _togglePlay = function() {
        if (Player.get("playing")) {
            Player.set("playing", false);
        } else {
            Player.set("playing", true);
        }
    }

    // Shows and hides actions as 3D entities when in "3D/VR mode"
    var _bind3DActions = function() {
        Player.bind("player:action:activated", _create3DAction);
        Player.bind("player:action:deactivated", _remove3DAction);
    }

    // Creates a supported action as an A-Frame VR element
    var _create3DAction = function(e, action) {
        console.log(action)

        // Generate element
        var elmAction;
        switch(action.type) {
            case 'image':
                //elmAction = _createImage3DAction(action);
                break;
            case 'testcube': // Just for testing
                elmAction = $('<a-box color="' + action.color + '" />');
                break;
        }

        // Only continue for supported action types
        if (!elmAction) {
            return;
        }

        // Calculate dimensions and position
        var transform = _calculate3DActionTransform(
            action.width, action.height, action.x, action.y);
        console.log(transform)

        // Apply common attributes
        elmAction.attr({
            width: transform.width,
            height: transform.height,
            position: transform.x + ", " + transform.y + ", " + transform.z,
            'action-id': action.action_id,
            visible: true //_isInVR
        });

        // Add to scene
        _sceneElement().append(elmAction);
    }

    var _calculate3DActionTransform = function(percentWidth, percentHeight, percentX, percentY) {
        // Green: Straight below camera
        // Input: x=1, y=0.5
        // Desired degrees: x=0, y=180, z=
        // Desired position: x=0, y=-5, z=0


        var viewPortRadius = 5;
        var radiansPerDegree = (Math.PI*2)/360 // Javascript sinus and cosinus uses radians, not degrees

        var degreeX = (percentX - 0.5)*360;
        var degreeY = (percentY - 0.5)*180;
        console.log("degreeX = ", degreeX, "degreeY = ", degreeY)
        var radianX = degreeX * radiansPerDegree;
        var radianY = degreeY * radiansPerDegree;
        var y = viewPortRadius * Math.cos(radianX) * Math.sin(radianY);
        var x = viewPortRadius * Math.sin(radianX) * Math.sin(radianY);
        var z = viewPortRadius * Math.cos(radianY) * -1;

        /*
        var degreeX = (percentX - 0.5)*360;
        console.log("degreeX: " + degreeX)
        var angleX = degreeX * radiansPerDegree;
        var x = Math.sin(angleX) * viewPortRadius;
        var z = Math.cos(angleX) * viewPortRadius * -1; // Positive Z is "behind" the camera

        var degreeY = (percentY - 0.5)*360;
        console.log("degreeY: " + degreeY)
        var angleY = degreeY * radiansPerDegree;
        var y = Math.sin(angleY) * viewPortRadius;
        */

        return {
            width: 1,
            height: 1,
            x: x,
            y: y,
            z: z
        };
    }

    var _calculate3DActionTransformOld = function(percentWidth, percentHeight, percentX, percentY) {
        // Base assumption: In cardboard mode, we can see approx.
        // 7 x 7 meters when looking at object 5 meters away
        var viewPortWidth = 7;
        var viewPortHeight = 7;

        // Calculate dimensions
        var width = viewPortWidth * percentWidth;
        var height = viewPortHeight * percentHeight;

        // Calculate positioning: Given coords are relative to upper left corner,
        // we needs them to be relative to the center middle (0, 0 , 0)
        var adjY = (viewPortHeight/2) * viewPortHeight * percentY;
        //var adjY = (7/2) - (7 * 0.14)
        var x = (percentWidth - percentX) * viewPortWidth;
        var y = (percentHeight - percentY) * viewPortHeight;
        var z = -5;

        return {
            width: width,
            height: height,
            x: x,
            y: y,
            z: z
        };
    }

    // Removes
    var _remove3DAction = function(e, action) {
        $('a-scene [action-id=' + action.action_id + ']').remove();
    }

    var _createImage3DAction = function(action) {
        var elmImage = $('<a-image />');
        elmImage.attr({ src: action.image });
        return elmImage;
    }

    var _showAll3DActions = function() {
        $('a-scene [action-id]').each(function(index, nodeAction) {
            $(nodeAction).attr({ visible: true });
        });
    }

    var _hideAll3DActions = function() {
        $('a-scene [action-id]').each(function(index, nodeAction) {
            $(nodeAction).attr({ visible: false });
        });
    }

    window.display360 = _display360;

})(jQuery, window, Player);
