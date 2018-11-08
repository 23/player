/*
  DESIGN THEME FOR THE PLAYER
*/

Player.provide('design',
  {
    showTray: true,
    verticalPadding:0,
    horizontalPadding:0,
    trayFont:'Helvetica',
    scrubberColor:'#1EC95B',
    endOn:'share',
    start: 0,
    loop: false
  },
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);

      // Insert the bootstrap module into DOM
      $('body').append($this.container);

      Player.getter("is_dev", function(){ return !!GLUEDEV; });

      // State controller for the playback flow
      // 1: Before playback of any video content. Video has been loaded.
      // 2: Playback has been initiated, showing prerolls and other actions before playback of content video
      // 3: Content video is active
      // 4: Content video has ended, showing postrolls and other "after video" actions
      // 5: Playflow ended. Show recommendations/sharing loop to next video, show any non-video actions
      var _playflowPosition = 0;
      var _setPlayflowPosition = function(nextPosition){
          if(nextPosition === _playflowPosition) return;
          var transition = {
              currentPosition: _playflowPosition,
              nextPosition: nextPosition,
              blocked: false,
              performTransition: (function(next){
                  return function(){
                      _setPlayflowPosition(next);
                  };
              })(nextPosition)
          };
          transition = Player.fire("player:playflow:beforetransition", transition);
          if(!transition.blocked){
              window.setTimeout(function(){
                  _playflowPosition = transition.nextPosition;
                  var playflowClasses = [];
                  for(var i = 1; i <= 5; i++) {
                      if(i != _playflowPosition) playflowClasses.push("playflow-position-"+i);
                  }
                  $("body").addClass("playflow-position-"+_playflowPosition).removeClass(playflowClasses.join(" "));
                  Player.fire("player:playflow:transitioned", {
                      currentPosition: _playflowPosition
                  });
              },1);
          }
          return !transition.blocked;
      };
      var _beforePlayHandled = false;
      var _resetPlayflowPosition = function(){
          _beforePlayHandled = false;
          _setPlayflowPosition(1);
      };

      // Listen for events to potentially change playflow position
      var _currentObjectId = 0;
      Player.bind("player:video:loaded", function(e,v){
          // check if the loaded video object is different from the last. If so, reset
          if(!v) return;
          var _nextObjectId = (v.type == "clip" ? v.photo_id : v.live_id);
          if(_nextObjectId != _currentObjectId){
              _currentObjectId = _nextObjectId;
              _resetPlayflowPosition();
          }
      });
      Player.bind("player:action:autoplayfailed", function(){
          Player.set('autoPlay', false);
          window.setTimeout(function(){
            _currentObjectId = 0;
            _resetPlayflowPosition();
            Player.set('reloadVideo', true);
          }, 300);
        });
      Player.bind("player:video:ready", function(){
        // "player:video:ready is called as a response to "player:video:loaded"
        // Here we timeout to allow handling of "player:video:loaded" to finish, before we autoplay
        window.setTimeout(function(){
          if( Player.get("autoPlay") ) {
            Player.set("playing", true);
          }
        }, 1);
      });
      Player.bind("player:video:beforeplay", function(e, playbackAllowed){
          if(!_beforePlayHandled){
              _beforePlayHandled = true;
              playbackAllowed = playbackAllowed && _setPlayflowPosition(2);
              return playbackAllowed;
          }
      });
      Player.bind("player:action:prerollsplayed", function(){
          // Play the content video now from the specified start time
          _setPlayflowPosition(3);
          Player.set("playing", true);
          if(Player.get("video_type") == "clip" && $this.start != 0){
              Player.set("currentTime", $this.start);
          }
          $this.start = 0;
      });
      Player.bind("player:video:play player:video:playing", function(){
          _setPlayflowPosition(3);
      });
      Player.bind("player:video:ended", function(){
          _setPlayflowPosition(4);
      });
      Player.bind("player:action:postrollsplayed", function(){
          _setPlayflowPosition(5);
      });
      Player.bind("player:playflow:transitioned", function(e, transition){
          // Read from settings the action to take when the playflow has been completed
          setTimeout(function(){
              if(transition.currentPosition == 5 && $this.loop){
                  _setPlayflowPosition(2);
              }else if(transition.currentPosition == 5 && !Player.get("actionsShown")){
                  if($this.endOn == "browse") {
                      Player.set("browseMode", true);
                  }else if($this.endOn == "loop" && Player.get("clips").length > 1){
                      Player.set("showLoop", true);
                  }else if($this.endOn == "share"){
                      Player.set("showSharing", true);
                  }
              }
          }, 10);
      });
      // Getter for retrieving current playflow position
      Player.getter('playflowPosition', function(){
          return _playflowPosition;
      });

      Player.bind('player:data:loaded', function(){
          if ($this.endOn == "browse") {
            Player.set('showBrowse', true);
          }
      });


      // Set .touch-class on body, if we're on iDevice or Android
      if(/iPad|iPhone|Android/.test(navigator.userAgent)){
          $("body").addClass("touch");
      }

      // Set classes on body to indicate video type
      Player.bind("player:video:loaded",function(e,v){
          if(typeof v == "undefined") return;
          var $body = $("body");
          if(v.type == "clip"){
              $body.removeClass("video-stream stream-dvr");
              $body.addClass("video-clip");
          }else{
              if(Player.get("stream_has_dvr")){
                  $body.removeClass("video-clip");
                  $body.addClass("video-stream stream-dvr");
              }else{
                  $body.removeClass("video-clip stream-dvr");
                  $body.addClass("video-stream");
              }
          }
      });

      Player.bind('player:settings', function(e){
          PlayerUtilities.mergeSettings($this, ['verticalPadding', 'horizontalPadding', 'trayFont', 'scrubberColor', 'showTray', 'endOn', 'start', 'loop']);
          Player.set("forcer", {
              type: "block",
              element: "tray",
              from: "settings",
              active: !$this.showTray
          });
          $this.applyDesignPreferences();
      });

      /* === TRAY HANDLING === */

      /* Showing/hiding the tray */
      var _trayTimeoutId = null;
      var _showTray = function(){
          window.clearTimeout(_trayTimeoutId);
          $('body').addClass("tray-shown");
          _trayTimeoutId = window.setTimeout(_hideTray, 5000);
      };
      var _hideTray = function(){
          window.clearTimeout(_trayTimeoutId);
          $('body').removeClass("tray-shown");
      };
      $(document).mousemove(_showTray);
      $(document).mouseleave(_hideTray);

      /*
         Allow modules to set "blocking" and "persisting" forcing classes on body.
         Usage: Player.set("forcer", {
           type: "force|block",
           element: "string",
           from: "senderModule"
           active: true|false,
         });
       */
      var _forcers = {};
      Player.setter("forcer", function(forcer){
          $.each(forcer.element.split(" "), function(i, element){
              var forcerClass = forcer.type + "-" + element;
              if(typeof _forcers[ forcerClass ] == "undefined"){
                  _forcers[ forcerClass ] = [];
              }
              var forcerArray = _forcers[ forcerClass ];
              var index = forcerArray.indexOf( forcer.from );
              if(forcer.active && index == -1){
                  forcerArray.push(forcer.from);
              }else if(!forcer.active && index > -1){
                  forcerArray.splice(index, 1);
              }
              $("body").toggleClass(forcerClass, forcerArray.length > 0);
          });
      });

      Player.getter('accentColor', function(){
          return $this.scrubberColor;
      });


      /* === END TRAY HANDLING === */
    
      $this.hexToRGBA = function(hex, alpha){
          var colorTest = hex.match(/^\#(..)(..)(..)$/);
          if(colorTest && colorTest.length==4) {
              var r = parseInt(colorTest[1], 16);
              var g = parseInt(colorTest[2], 16);
              var b = parseInt(colorTest[3], 16);
              return 'rgba('+r+','+g+','+b+','+alpha+')';
          }
          return false;
      };
      function hexToRGB(hex, alpha) {
        var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
        
        if (alpha) {
          return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
        } else {
          return "rgb(" + r + ", " + g + ", " + b + ")";
        }
      }
      $this.applyDesignPreferences = function(){
          $("filter#icon_hover feFlood").attr("flood-color", $this.scrubberColor);

          var css = "";
          // Background colors
          css += ".tray-left .button-container:hover > button { background-color: " + $this.scrubberColor + "; }";
          css += ".scrubber-buffer, .scrubber-play { background-color: " + $this.scrubberColor + "; }";
          css += ".volume-slider .volume-level { background-color: " + $this.scrubberColor + "; }";
          css += ".big-play-button, .button-container > .loop-play-button { background-color: " + $this.scrubberColor + "; }";
          css += ".big-play-button:hover, .button-container:hover > .loop-play-button { background-color: " + $this.hexToRGBA( $this.scrubberColor, 0.85 ) + "; }";
          css += ".share-button:hover, .close-button:hover { background-color: " + $this.scrubberColor + "; }";
          css += ".sharing-info a:hover { color: " + $this.scrubberColor + "; }";
          css += ".protection-password input.submitbutton { background-color: " + $this.scrubberColor + "; }";
          css += ".protection-password input.submitbutton:hover { background-color: " + $this.hexToRGBA($this.scrubberColor, 0.9) + "; }";
          css += ".glue-sections-menu:not(.sections-menu-open) .sections-menu-wrap:hover { background-color: " + $this.scrubberColor + "; }";
          css += ".sections-menu-open #section-menu-toggle:hover { background-color: " + $this.scrubberColor + "; }";
          css += ".section-item.active:hover { background-color: " + hexToRGB($this.scrubberColor, "0.6") + "; }";
          css += ".section-item.active { background-color: " + hexToRGB($this.scrubberColor, "0.6") + "; }";

          // SVG filter
          css += ".tray-right .button-container:hover > button { -webkit-filter: url(#icon_hover); filter: url(#icon_hover); }";
          css += ".subtitle-button-active .cc-active-bar-icon { -webkit-filter: url(#icon_hover); filter: url(#icon_hover); }";
          css += ".more-button:hover, .download-button:hover { -webkit-filter: url(#icon_hover); filter: url(#icon_hover); }";
          css += ".video-display .controls-360 div:hover { -webkit-filter: url(#icon_hover); filter: url(#icon_hover); }";

          // Text color
          css += "ul.button-menu li:hover button { color: " + $this.scrubberColor + "; }";
          css += ".menu-list li a:hover { color: " + $this.scrubberColor + "; }";

          //Font
          css += "body { font-family: " + $this.trayFont + ", sans-serif; }";

          // Border color
          css += ".loop-container-cell { border-color: " + $this.scrubberColor + "; }";

          // Vertical and horisontal padding
          css += ".video-display { bottom: " + $this.verticalPadding + "px; left: " + $this.horizontalPadding + "px; }";

          $this.applyStyle(css);
      }
      $this.applyStyle = function(css){
          if(!$this.stylesheet){
              var head = document.head || document.getElementsByTagName("head")[0];
              $this.stylesheet = document.createElement("style");
              $this.stylesheet.type = "text/css";
              head.appendChild($this.stylesheet);
          }
          if($this.stylesheet.styleSheet){
              $this.stylesheet.styleSheet.cssText = css;
          }else{
              if($this.stylesheet.childNodes.length > 0){
                  $this.stylesheet.removeChild( $this.stylesheet.childNodes[0] );
              }
              $this.stylesheet.appendChild(document.createTextNode(css));
          }
      };

      if (!/Android/.test(navigator.userAgent) && 'ontouchstart' in document.documentElement) {
          // Fullscreen on pinch to zoom
          $(document).on("gesturechange", function(e){
              if (e.originalEvent.scale > 1) {
                  Player.set("fullscreen", true);
              }
          });
          // Quicker response on tap
          $(document).on("touchstart", function(e){
              if (e.originalEvent.touches.length == 1) {
                  if( $(e.target).prop("tagName")!="A" && $(e.target).prop("tagName")!="INPUT" ){
                    $this.touchResponse = true;
                    $this.touchEvent = e.originalEvent;
                  }
              }
          });
          $(document).on("touchmove", function(e){
              if (e.originalEvent.touches.length == 1) {
                $this.touchResponse = false;
              }
          });
          $(document).on("touchend", function(e){
              if ($this.touchResponse) {
                try {$(e.target).mousemove();}catch(e){}
                $(e.target).trigger("click", $this.touchEvent);
                $this.touchEvent.preventDefault();
                e.preventDefault();
              }
              $this.touchResponse = false;
          });
      }

      Player.set("forcer", {type: "block", element: "tray", from: "design", active: true});
      Player.bind("player:playflow:transitioned", function(e, transition){
          if(transition.currentPosition == 3){
              Player.set("forcer", {type: "block", element: "tray", from: "design", active: false});
          }
      });

      // RESIZE HANDLING
      var _resize = function(){
          // This is a pretty fancy fix for an IE7 bug:
          // Empty elements are given layout, causing all kinds of buttons the .tray-right
          // and tray-left to go flying. Very litterally: Hide empty stuff, show other.
          $('.tray-right>div:empty').hide();
          $('.tray-right>div:parent').show();

          var buttonWidth = 30;
          var r = $('.tray-right .button-container > button:visible').length * buttonWidth + 5;
          $('.tray-scrubber').css({marginRight:r+'px'});
      }
      $(window).resize(_resize);
      Player.bind('glue:render', _resize);

      // Force IE 7,8,9 to constantly check for window resize
      // Needed when iframe is not visible when it loads
      if(/IE (7|8|9)/.test(navigator.userAgent)){
          $this.windowWidth = -1;
          window.setInterval(function(){
              if($this.windowWidth != $(window).width()){
                  $this.windowWidth = $(window).width();
                  $(window).resize();
              }
          },1000);
      }

      $this.render();

      // Return a reference
      return $this;
  }
);
