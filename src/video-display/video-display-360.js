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
            _videoElement().container.bind("click", _togglePlay);
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
        // Generate element
        var elmAction;
        switch(action.type) {
            case 'image':
                elmAction = _createImage3DAction(action);
                break;
        }

        // Only continue for supported action types
        if (!elmAction) {
            return;
        }

        // Calculate dimensions and position
        var transform = _calculate3DActionTransform(
            parseFloat(action.width, 10),
            parseFloat(action.height, 10),
            parseFloat(action.x, 10),
            parseFloat(action.y, 10)
        );

        // Apply common attributes
        elmAction.attr({
            width: transform.width,
            height: transform.height,
            position: transform.position.x + ", " + transform.position.y + ", " + transform.position.z,
            rotation: transform.rotation.x + ", " + transform.rotation.y + ", " + transform.rotation.z,
            'action-id': action.action_id,
            visible: true //_isInVR
        });

        // Apply click handler if action has a link
        if (action.link) {
            elmAction.bind('click', _on3DActionClicked.bind(this, action));
            // Mouse enter and leave doesn't play well with jQuery events for some reason
            elmAction[0].addEventListener('mouseenter', _on3DActionMouseEntered.bind(elmAction, action));
            elmAction[0].addEventListener('mouseleave', _on3DActionMouseLeft.bind(elmAction, action));
        }

        // Add to scene
        _sceneElement().append(elmAction);
    }

    var _calculate3DActionTransform = function(percentWidth, percentHeight, percentX, percentY) {
        var viewPortRadius = 5;
        var viewPortCircumference = viewPortRadius*2*Math.PI;
        var radiansPerDegree = (Math.PI*2)/360 // Javascript sinus and cosinus uses radians, not degrees

        var degreeHorizontal = (percentX+percentWidth/2)*360;
        var degreeVertical = (percentY+percentHeight/2)*180;
        var radianX = degreeHorizontal * radiansPerDegree;
        var radianY = degreeVertical * radiansPerDegree;
        var posZ = viewPortRadius * Math.cos(radianX) * Math.sin(radianY);
        var posX = viewPortRadius * Math.sin(radianX) * Math.sin(radianY) * -1;
        var posY = viewPortRadius * Math.cos(radianY);

        var width = viewPortCircumference * percentWidth;
        var height = viewPortCircumference * percentHeight;

        var rotX = 90 - degreeVertical;
        var rotY = 180 - degreeHorizontal;
        var rotZ = 0;

        return {
            width: width,
            height: height,
            position: {
                x: posX,
                y: posY,
                z: posZ
            },
            rotation: {
                x: rotX,
                y: rotY,
                z: rotZ
            }
        };
    }

    // Removes
    var _remove3DAction = function(e, action) {
        $('a-scene [action-id=' + action.action_id + ']').remove();
    }

    var _createImage3DAction = function(action) {
        var elmImage = $('<a-image />');
        elmImage.attr({
            src: action.image,
            transparent: 'true'
        });
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

    var _on3DActionClicked = function(action) {
        if(/^\$/.test(action.link)){ // Is the link a Glue command? Run it!
            Player.runCommand({command: action.link});
        } else { // Open link with relevant target
            Player.fire("player:action:click", action);
            window.open(action.link, (action.link_target || '_new'));
        }
    }

    var _on3DActionMouseEntered = function(action) {
        var actionHoverScaleIncrease = 0.2;
        var newScale = 1 + actionHoverScaleIncrease;

        $(this).attr({
            scale: newScale + ', ' + newScale + ', ' + newScale
        })
    }

    var _on3DActionMouseLeft = function(action) {
        $(this).attr({ scale: '1 1 1'});
    }

    window.display360 = _display360;

})(jQuery, window, Player);
