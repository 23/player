/*
  MODULE: ACTIONS

  Fires for:
  - player:actions:video:start
  - player:actions:video:complete
  - player:actions:video:click
  - player:actions:video:close
  - player:actions:overlay:start
  - player:actions:overlay:complete
  - player:actions:overlay:click

  Answers properties:
  - identityCountdown [get]
  - identityAllowClose [get]
  - identityCountdownText [get]
  - closeIdentity [set]
  - showActions  [get]
  - videoActions [get] (before, relative time from 0 to 1, after)
*/

Player.provide('actions',
  {
    showActions: 1,
    identityCountdown: false,
    identityAllowClose: false,
    identityAllowCloseAfterSeconds: 0,
    identityCountdownTextSingular: "Ad ends in % second",
    identityCountdownTextPlural: "Ad ends in % seconds",
    closeCountdownTextSingular: "Skip ad in % second",
    closeCountdownTextPlural: "Skip ad in % seconds"
  },
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);
    $this.showHandlers = {};
    $this.hideHandlers = {};
    $this.dispatcherActive = false;
    $this.activeActions = {};

    // Build default properties and merge in player settings
    Player.bind('player:settings', function(){
        PlayerUtilities.mergeSettings($this, ['showActions', 'identityCountdown', 'identityAllowClose', 'identityAllowCloseAfterSeconds', 'identityCountdownTextSingular', 'identityCountdownTextPlural', 'closeCountdownTextSingular', 'closeCountdownTextPlural', 'start']);
        $this.identityAllowCloseAfterSeconds = parseInt($this.identityAllowCloseAfterSeconds,10);
    });

    // Hide actions when necessary for clicking the fullscreen prompt in the Flash object in IE 7-10
    Player.bind('player:video:fullscreenprompt', function(e){
      $this.container.hide();
    });
    Player.bind('player:video:clearfullscreenprompt', function(e){
      $this.container.show();
    });

    // Dummy element for testing support for background-opacity
    $this.dummyElement = $(document.createElement('div')).css({backgroundColor:'rgba(0,0,0,.666)'});
    $this.rgbaSupport = /^rgba/.test($this.dummyElement.css('backgroundColor'));

    // Clicks on the container (but not individual actions) should toggle playback
    $this.container.on("click", function(e){
      if(e.handled||e.target!=this) return;
      if(Player.get("displayDevice") == "html5" && Player.get("videoElement").video.get(0).muted){
        Player.get("videoElement").video.get(0).muted = false;
        Player.set("mutedAutoPlay", false);
      } else {
        Player.set("playing", !Player.get("playing"));
      }
      e.handled = true;
      e.stopPropagation();
      e.preventDefault();
    });

    registerActionHandlers($this);

    Player.bind("player:playflow:transitioned", function(e, transition){
      if(transition.currentPosition == 3 || transition.currentPosition == 5){
        $this.dispatcherActive = true;
      }else{
        $this.dispatcherActive = false;
      }
      if(transition.currentPosition == 2 || transition.currentPosition == 4){
        $this.playRolls(transition.currentPosition == 2 ? -1 : 2);
      }
      if(transition.currentPosition == 5){
        _dispatcher(false, 2);
      }
    });
    Player.bind("player:video:play player:video:playing player:video:timeupdate player:video:pause", function(){
        _dispatcher(Player.get("playing"))
    });

    // CONTROLLER LISTENING TO PLAYBACK STATE AND DISPATCHING ACTIONS
    var _dispatcher = function(playing, pos){
      var ct = Player.get("currentTime"), d = Player.get("duration");
      var actionsPositionDuration = pos || (ct / d);
      var actionsPositionDays = pos || (ct / 86400);
      // Is the dispatcher active and supposed to dispatch actions?
      if($this.dispatcherActive != true || isNaN(actionsPositionDuration)) {
        return true;
      }

      // Dispatch actions
      $.each(Player.get('videoActions'), function(i,action){
        // The dispatcher does not handle prerolls and postrolls
        if(action.type=="ad"||action.type=="video"){ return; }
        // Ignore actions on live that are positioned relative to duration
        if(Player.get("video_type") == "stream" && action.time_relative_to == "duration" && action.normalizedStartTime >= 0) { return; }

        // Figure out if the action should be active or not
        // First, are we on or in between start time and end time?
        var actionActive = false;
        if(action.time_relative_to != "days"){
          actionActive = actionsPositionDuration>=action.normalizedStartTime;
          actionActive = actionActive && actionsPositionDuration<=action.normalizedEndTime;
        }else{
          if(action.normalizedStartTime <= 1 && action.normalizedStartTime * 86400 >= d){
            // If the action is placed relative to days and the start time does not lie
            // within the duration of the video, show the action just before the video ends
            action.normalizedStartTime = (d-1) / 86400;
          }
          actionActive = actionsPositionDays>=action.normalizedStartTime;
          actionActive = actionActive && actionsPositionDays<=action.normalizedEndTime;
        }

        // If not, check if we should be a little more flexible for actions that should pause playback
        if(!actionActive && action.pause_mode=="pause_playback"){
          var start_sec = action.normalizedStartTime*d;
          var end_sec = action.normalizedEndTime*d;
          if(end_sec-start_sec<2){
            actionActive = ct+0.5>=start_sec && ct-0.5<=end_sec && !action.failed;
          }
        }
        // If action is active according to timing, check if it should only be shown when video is paused
        actionActive = actionActive && (!action.pause_mode || action.pause_mode!="only_on_pause" || !playing);

        // If loading of the action failed, don't show it
        actionActive = actionActive && !action.failed;

        if(actionActive && !$this.activeActions[action.action_id]) { // If action is active but have not yet been parsed, do so now

          // Ad action to the list of active actions
          $this.activeActions[action.action_id] = action;

          // Create a few dom containers for the action
          $this.createActionContainer(action);

          // Click container for the element
          if(typeof(action.link)!='undefined' && action.link != '' && action.type != "video") {
            var screen = $(document.createElement('a')).addClass('action-screen');
            if(/^\$/.test(action.link)){ // Is the link a Glue command? Run it!
              screen.click({command: action.link}, function(e){
                Player.fire("player:action:click", action);
                Player.runCommand(e);
                e.preventDefault();
              });
            }else{ // Open link with relevant target
              screen.attr({href:action.link, target:action.link_target||'_new'}).on("click", function(){
                Player.fire("player:action:click", action);
              });
            }
            action.parent.append(screen);
          }
          // Set position
          if(typeof(action.x)!='undefined' && typeof(action.y)!='undefined' && action.type != "product") {
            action.parent.css({top:(parseFloat(action.y)*100)+'%', left:(parseFloat(action.x)*100)+'%'});
          }
          // Set size
          if(typeof(action.width)!='undefined' && typeof(action.height)!='undefined' && action.type != "product") {
            action.parent.css({width:(parseFloat(action.width)*100)+'%', height:(parseFloat(action.height)*100)+'%'});
          }
          // Set background color and opacity
          if(typeof(action.background_color)!='undefined' && action.background_color!='' && action.background_color != "transparent" && action.background_opacity != "0") {
            var alpha = action.background_opacity || 0.8;
            if(alpha < 1 && $this.rgbaSupport) { // We can do regular rgba coloring of the background
              var colorTest = action.background_color.match(/^\#(..)(..)(..)$/);
              if(colorTest && colorTest.length==4) {
                var r = parseInt(colorTest[1], 16);
                var g = parseInt(colorTest[2], 16);
                var b = parseInt(colorTest[3], 16);
                var backgroundColorRGBA = 'rgba('+r+','+g+','+b+','+alpha+')';
                action.parent.css({"background-color":backgroundColorRGBA});
              }else{
                action.parent.css({"background-color":action.background_color});
              }
            }else{ // old browser. luckily, Microsoft's got us covered with filters
              if(alpha < 1 && /MSIE/.test(navigator.userAgent)){
                var hexTransparency = Math.floor(alpha*255).toString(16).substr(0,2);
                var rawColor = action.background_color.substr(1);
                var grad = "#"+hexTransparency+rawColor;
                action.parent.css({
                  "background-color":"transparent",
                  "zoom":"1",
                  "filter":"progid:DXImageTransform.Microsoft.gradient(startColorstr="+grad+",endColorstr="+grad+")"
                });
              }else{ // nothing to do about it, solid color it is
                action.parent.css({"background-color":action.background_color});
              }
            }
          }
          // Set text color
          if(typeof(action.text_color)!='undefined'){
            action.parent.css({"color":action.text_color});
          }
          // Set border
          if(typeof(action.border)!='undefined'){
            if(action.border=='always'){
              action.parent.addClass("action-border");
            }else if(action.border=='hover'){
              action.parent.addClass("action-border-hover");
            }
          }

          // Possibly pause video (important to be done after action has been added to activeActions
          // because of async behaviour when using ExternalInterface)
          if(typeof action.pause_mode != "undefined" && action.pause_mode == "pause_playback"){
            Player.set("playing", false);
          }

          // Call the relevant showhandler, if it exists
          var result;
          if($this.showHandlers[action.type]) {
            result = $this.showHandlers[action.type](action);
          }
          Player.fire("player:action:activated", action);
          return result;
        } else if(!actionActive && $this.activeActions[action.action_id]) {
          // Deactivate action by calling hide handler and then unloading the container
          // If the hide handler return true, it will be responsible for unloading the containers
          if($this.hideHandlers[action.type]) var retain = $this.hideHandlers[action.type](action);
          if(!retain){
            if(action.parent) {
              action.parent.remove();
            }
            delete action.container;
            delete action.parent;
            delete $this.activeActions[action.action_id];
          }
          Player.fire("player:action:deactivated", action);
        }
      });

      Player.fire("player:action:dispatched");
    }

    $this.createActionContainer = function(action){
      action.parent = $(document.createElement('div')).addClass('action').addClass('action-'+action.type);
      action.container = $(document.createElement('div')).addClass('action-content');
      action.parent.append(action.container);
      $this.container.append(action.parent);
    };

    var _rollsQueued = 0;
    $this.playRolls = function(position){
      var isVideo = false, foundRoll = false;
      if(!$this.actionsLoaded){
          return _rollsQueued = position;
      }
      _rollsQueued = 0;
      $.each(Player.get("videoActions"), function(i, action){
        isVideo = (action.type == "video" || action.type == "ad");
        if(isVideo && action.normalizedStartTime == position) {
          foundRoll = true;
          $this.createActionContainer(action);
          return $this.showHandlers[action.type](action);
        }
      });
      if(!foundRoll){
        Player.fire( position == -1 ? "player:action:prerollsplayed" : "player:action:postrollsplayed" );
      }
    };

    // Return an array of video and video ad actions that are active at same time as a
    $this.getOverlappingActions = function(a){
      var actions = [];
      $.each(Player.get('videoActions'), function(i,action){
        var actionActive = action.normalizedStartTime==a.normalizedStartTime;
        if(actionActive) actions.push(action);
      });
      return actions;
    };

    $this.normalizeActionTimes = function(actions){
      $.each(actions, function(i,action){
        action.normalizedStartTime = (action.start_time == "before" ? -1 : (action.start_time == "after" ? 2 : parseFloat(action.start_time)));
        action.normalizedEndTime = (action.end_time == "before" ? -1 : (action.end_time == "after" ? 2 : parseFloat(action.end_time)));
      });
    };

    // When a video is loaded, load the relevant actions and reset state variables
    Player.bind('player:video:loaded', function(e,v){
      if(v.actions){
          Player.fire("player:action:loaded", v.actions);
      } else {
          $this.actionsLoaded = false;
          Player.set("loadActions", false);
      }
      $this._resize();
    });
    Player.bind("player:action:loaded", function(e, actions){
        $this.normalizeActionTimes(actions);
        $this.actionsLoaded = true;
        if(_rollsQueued != 0){
            $this.playRolls(_rollsQueued);
        }
    });

    var lastWidth = 0;
    var lastHeight = 0;
    // Handle resizing of actions and the module action
    $this._resize = function(){
      var v = Player.get("video");
      if(v && v.video_medium_width){
        // Calculate aspect ratio of the video, so we can resize and position the module container on top of it
        var w = $(".video-display");
        var wh = w.height();
        var ww = w.width();
        // Check if window dimensions have in fact changed
        if (lastWidth != ww || lastHeight != wh) {
          lastWidth = ww;
          lastHeight = wh;
          var wr = ww/wh;
          var vr = v.video_medium_width / v.video_medium_height;
          if(vr>wr){
            $this.container.css({
              "width":""+ww+"px",
              "height":""+(ww/vr)+"px",
              "margin-top":""+(wh-ww/vr)/2+"px",
              "margin-left":0
            });
          }else{
            $this.container.css({
              "height":""+wh+"px",
              "width":""+(wh*vr)+"px",
              "margin-top":0,
              "margin-left":""+(ww-wh*vr)/2+"px"
            });
          }
        }
      }
      // Adjust sizing of active text, image and banner actions
      $.each($this.activeActions||{}, function(i, action){
        if(action.type=="image"||action.type=="banner"){
          var img = action.container.find("img");
          var apw = action.parent.get(0).clientWidth;
          var aph = action.parent.get(0).clientHeight;
          if(action.aspect_ratio>apw/aph){
            img.css({
              width: Math.min(apw, action.image_width),
              height: "auto"
            });
          }else{
            img.css({
              width: "auto",
              height: Math.min(aph, action.image_height)
            });
          }
        }
        if(action.type=="text"&&/MSIE 7/.test(navigator.userAgent)){
          window.setTimeout(function(){
            action.container.outerHeight(action.parent.get(0).clientHeight);
          },10);
        }
      });
      window.setTimeout(function(){
        $(".action-text .action-content").css({fontSize:($this.container.get(0).clientWidth/640*100)+'%'});
      },10);
    };
    $(window).resize($this._resize);

    // GETTERS EXPOSING GENERIC PROPERTIES OF THE MODULE
    Player.getter('videoActions', function(){
      if(!Player.get('showActions')) return;

      var v = Player.get('video');
      return (v && v.actions ? v.actions : []);
    });
    Player.getter('showActions', function(){
      return $this.showActions;
    });
    Player.getter('identityCountdown', function(){return $this.identityCountdown;});
    Player.getter('identityAllowClose', function(){
        return $this.identityAllowClose && Math.round(Player.get('currentTime')) >= $this.identityAllowCloseAfterSeconds;
    });
    Player.getter('identityCountdownText', function(){
      // Format countdown
      try {
        var duration = Math.round(Player.get("videoElement").getDuration());
        var currentTime = Math.round(Player.get("videoElement").getCurrentTime());
        var timeLeft = 0;
        if(currentTime>=$this.identityAllowCloseAfterSeconds||!$this.identityAllowClose){
          timeLeft = duration - currentTime;
          if(isNaN(timeLeft)) return '';
          var s = (timeLeft==1 ? $this.identityCountdownTextSingular : $this.identityCountdownTextPlural);
          return s.replace(/\%/img, timeLeft);
        }else{
          timeLeft = $this.identityAllowCloseAfterSeconds - currentTime;
          var s = (timeLeft==1 ? $this.closeCountdownTextSingular : $this.closeCountdownTextPlural);
          return s.replace(/\%/img, timeLeft);
        }
      }catch(e){
        return '';
      }
    });
    Player.getter('hasLink', function(){
        return $this.videoActionHandler.hasLink();
    });
    Player.getter("videoActionPlaying", function(){
      return $this.videoActionPlaying;
    });
    Player.getter("actionsShown", function(){
      var shown = false;
      $.each($this.activeActions, function(i,action){
        if(action.type!="video"&&action.type!="ad"){
          shown = true;
          return false;
        }
      });
      return shown;
    });
      Player.setter('clickAction', function(){
          $this.videoActionHandler.actionClick();
      });
      Player.setter('closeIdentity', function(){
          $this.videoActionHandler.skipAction();
      });

    // LOAD ACTIONS DATA
    // forceLoad forces reloading of actions even they have already been loaded once for the current video
    Player.setter("loadActions", function(forceLoad){
      if(!Player.get('showActions')) return;

      $this.container.html("");
      $this.activeActions={};
      var v = Player.get("video");
      if( !v.actions || forceLoad ) {
        var data = (v.type == "clip" ? {photo_id: v.photo_id} : {live_id: v.live_id});
        $.extend(data, {
          token:v.token,
          player_id: Player.get("player_id")
        });
        Player.get('api').action.get(data, function(data){
          v.actions = data.actions;
          Player.fire("player:action:loaded", v.actions);
        }, Player.fail);
      } else {
        Player.fire("player:action:loaded", Player.get("videoActions"));
      }
    });
    Player.setter("videoActionPlaying", function(vap){
      $this.videoActionPlaying = vap;
    });

    return $this;
  }
);
