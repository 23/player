/*
   DESIGN THEME FOR THE PLAYER
 */

Player.provide('design',
               {
                 showTray: true,
                 alwaysShowTray: false,
                 verticalPadding:0,
                 horizontalPadding:0,
                 trayFont:'Helvetica',
                 scrubberColor:'#1EC95B',
                 backgroundColor:'black',
                 borderRadius:'',
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
                   PlayerUtilities.mergeSettings($this, ['verticalPadding', 'horizontalPadding', 'trayFont', 'scrubberColor', 'backgroundColor', 'borderRadius', 'showTray', 'endOn', 'start', 'loop', 'alwaysShowTray']);
                   Player.set("forcer", {
                     type: "block",
                     element: "tray",
                     from: "settings",
                     active: !$this.showTray
                   });
                   $this.applyDesignPreferences();
                   if($this.alwaysShowTray) {
                     window.setTimeout(function(){
                       Player.set('alwaysShowTray', true);
                     }, 500);
                   }
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
                   if($this.alwaysShowTray) return;
                   window.clearTimeout(_trayTimeoutId);
                   $('body').removeClass("tray-shown");
                 };
                 $(document).mousemove(_showTray);
                 $(document).mouseleave(_hideTray);

                 /* Setter + Getter for alwaysShowTray */
                 Player.getter('alwaysShowTray', function(){
                   return $this.alwaysShowTray;
                 });
                 Player.setter('alwaysShowTray', function(ast){
                   $this.alwaysShowTray = ast;
                   if($this.alwaysShowTray) {
                     Player.set('infoShown', false);
                     Player.set("forcer", {type: "block", element: "tray", from: "design", active: false});
                     _showTray();
                   } else {
                     _hideTray();
                   }
                 });

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
                   $("filter#icon_color feFlood").attr("flood-color", "white");

                   // CSS variables
                   var rootStyle = document.documentElement.style;
                   rootStyle.setProperty('--scrubber-color', $this.scrubberColor);
                   rootStyle.setProperty('--scrubber-color-light', $this.hexToRGBA($this.scrubberColor, 0.9));
                   rootStyle.setProperty('--scrubber-color-lighter', $this.hexToRGBA($this.scrubberColor, 0.85));
                   rootStyle.setProperty('--scrubber-color-lightest', $this.hexToRGBA($this.scrubberColor, 0.72));
                   rootStyle.setProperty('--tray-font', $this.trayFont + ', sans-serif');
                   rootStyle.setProperty('--player-vertical-padding', $this.verticalPadding+'px');
                   rootStyle.setProperty('--player-horizontal-padding', $this.horizontalPadding+'px');
                   if($this.backgroundColor) {
                     rootStyle.setProperty('--player-background-color', $this.backgroundColor);
                   }
                   if($this.borderRadius) {
                     rootStyle.setProperty('--player-border-radius', $this.borderRadius + 'px');
                   }
                 }

                 Player.set("forcer", {type: "block", element: "tray", from: "design", active: true});
                 Player.bind("player:playflow:transitioned", function(e, transition){
                   if(transition.currentPosition == 3){
                     Player.set("forcer", {type: "block", element: "tray", from: "design", active: false});
                   }
                 });

                 Player.bind('glue:localechange', function(evt,lang){$('html').attr({lang:lang})});

                 $this.render();

                 // Return a reference
                 return $this;
               }
);
