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
  - actionsPosition [get] (before, relative time from 0 to 1, after)
  - identityCountdown [get]
  - identityAllowClose [get]
  - identityCountdownText [get]
  - closeIdentity [set]
  - videoActions [get] (before, relative time from 0 to 1, after)
*/

Player.provide('actions',
  {
    identityCountdown: false,
    identityAllowClose: false,
    identityAllowCloseAfterSeconds: 0,
    identityCountdownTextSingular: "This advertisement will end in % second",
    identityCountdownTextPlural: "This advertisement will end in % seconds",
    closeCountdownTextSingular: "This advertisement can be closed in % second",
    closeCountdownTextPlural: "This advertisement can be closed in % seconds"
  },
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);
    $this.showHandlers = {};
    $this.hideHandlers = {};
    $this.dispatcherActive = true;
    $this.activeActions = {};
    $this.normalizedActionsPosition = -1; // (-1 for "before", relative time from 0 to 1 during playback, 2 for "after")
    // Build default properties and merge in player settings
    Player.bind('player:settings', function(){
        PlayerUtilities.mergeSettings($this, ['identityCountdown', 'identityAllowClose', 'identityAllowCloseAfterSeconds', 'identityCountdownTextSingular', 'identityCountdownTextPlural', 'closeCountdownTextSingular', 'closeCountdownTextPlural', 'start']);
        $this.identityAllowCloseAfterSeconds = parseInt($this.identityAllowCloseAfterSeconds,10);
    });

    // Hide actions when necessary for clicking the fullscreen prompt in the Flash object in IE 7-10
    Player.bind('player:video:fullscreenprompt', function(e){
      $this.container.hide();
    });
    Player.bind('player:video:clearfullscreenprompt', function(e){
      $this.container.show();
    });

    // Clicks on the container (but not individual actions) should toggle playback
    $this.container.on("click", function(e){
      if(e.handled||e.target!=this) return;
      Player.set("playing", !Player.get("playing"));
      e.handled = true;
      e.stopPropagation();
      e.preventDefault();
    });

    registerActionHandlers($this);

    // Dummy element for testing support for background-opacity
    $this.dummyElement = $(document.createElement('div')).css({backgroundColor:'rgba(0,0,0,.666)'});
    $this.rgbaSupport = /^rgba/.test($this.dummyElement.css('backgroundColor'));

    // CONTROLLER LISTENING TO PLAYBACK STATE AND DISPATCHING ACTIONS
    var _dispatcher = function(event){
      // We need to get 'currentTime', 'duration' and 'playing' before checking dispatcherActive, probably
      // because interfacing with Flash's ExternalInterface in some cases is async and therefore
      // may allow other events being fired and possibly changing the value of dispatcherActive
      var ct = Player.get('currentTime');
      var d = Player.get('duration');
      var playing = Player.get('playing');
      // Is the dispatcher active and supposed to dispatch actions?
      if($this.dispatcherActive != true) {
        return true;
      }
      // Queue playback, if actions are not loaded yet
      if(!$this.actionsLoaded){
        if(event=="player:video:beforeplay"){
          $this.queuePlay = true;
        }
        return false;
      }

      $this.normalizedActionsPosition = $this.normalizeEventToPosition(event, ct, d);
      if(!$this.normalizeEventToPosition){return;}

      var videoActionActive = false;

      // Dispatch actions
      $.each(Player.get('videoActions'), function(i,action){

        // Figure out if the action should be active or not
        // First, are we on or in between start time and end time?
        var actionActive = $this.normalizedActionsPosition>=action.normalizedStartTime && $this.normalizedActionsPosition<=action.normalizedEndTime && !action.failed;
        // If not, check if we should be a little more flexible for actions that should pause playback
        if(!actionActive && action.pause_mode=="pause_playback"){
          var start_sec = action.normalizedStartTime*d;
          var end_sec = action.normalizedEndTime*d;
          if(end_sec-start_sec<2){
            actionActive = ct+0.5>=start_sec && ct-0.5<=end_sec && !action.failed;
          }
        }
        // If action is active according to timing, check if it should only be shown when video is paused
        actionActive = (actionActive && (!action.pause_mode || action.pause_mode!="only_on_pause" || !playing));

        if(actionActive && !$this.activeActions[action.action_id]) { // If action is active but have not yet been parsed, do so now

          // Should we ignore video and video ad action? (If actionsPosition is -1, but playback has not started yet)
          if((action.type=="video"||action.type=="ad")&&$this.ignoreVideoActions) return;
          // Ad action to the list of active actions
          $this.activeActions[action.action_id] = action;

          // Create a few dom containers for the action
          var parent = $(document.createElement('div')).addClass('action').addClass('action-'+action.type);
          var container = $(document.createElement('div')).addClass('action-content');
          parent.append(container);
          $this.container.append(parent);
          action.container = container;
          action.parent = parent;

          // Click container for the element
          if(typeof(action.link)!='undefined' && action.link != '' && action.type != "video") {
            var screen = $(document.createElement('a')).addClass('action-screen');
            if(/^\$/.test(action.link)){ // Is the link a Glue command? Run it!
              screen.click({command: action.link}, function(e){
                Player.runCommand(e);
                e.preventDefault();
              });
            }else{ // Open link with relevant target
              screen.attr({href:action.link, target:action.link_target||'_new'}).on("click", function(){
                Player.fire("player:action:click", action);
              });
            }
            parent.append(screen);
          }
          // Set position
          if(typeof(action.x)!='undefined' && typeof(action.y)!='undefined' && action.type != "product") {
            parent.css({top:(parseFloat(action.y)*100)+'%', left:(parseFloat(action.x)*100)+'%'});
          }
          // Set size
          if(typeof(action.width)!='undefined' && typeof(action.height)!='undefined' && action.type != "product") {
            parent.css({width:(parseFloat(action.width)*100)+'%', height:(parseFloat(action.height)*100)+'%'});
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
                parent.css({"background-color":backgroundColorRGBA});
              }else{
                parent.css({"background-color":action.background_color});
              }
            }else{ // old browser. luckily, Microsoft's got us covered with filters
              if(alpha < 1 && /MSIE/.test(navigator.userAgent)){
                var hexTransparency = Math.floor(alpha*255).toString(16).substr(0,2);
                var rawColor = action.background_color.substr(1);
                var grad = "#"+hexTransparency+rawColor;
                parent.css({
                  "background-color":"transparent",
                  "zoom":"1",
                  "filter":"progid:DXImageTransform.Microsoft.gradient(startColorstr="+grad+",endColorstr="+grad+")"
                });
              }else{ // nothing to do about it, solid color it is
                parent.css({"background-color":action.background_color});
              }
            }
          }
          // Set text color
          if(typeof(action.text_color)!='undefined'){
            parent.css({"color":action.text_color});
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

          if(action.type=="ad"||action.type=="video"){
            videoActionActive = true;
          }

          // Call the relevant showhandler, if it exists
          if($this.showHandlers[action.type]) {
            return $this.showHandlers[action.type](action);
          }

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
        }
      });

      $this.ignoreVideoActions = false;

      // If we're about to show prerolls, we need to abort the initial playback call,
      // since Windows Phone otherwise blocks attempts to change source on the video element
      if(event=="player:video:beforeplay"&&$this.normalizedActionsPosition==-1&&videoActionActive&&/Windows Phone/.test(navigator.userAgent)){
        return false;
      }

      Player.fire("player:action:dispatched");
      return true;
    }

    $this.normalizeEventToPosition = function(event, ct, d){
      var ret;
      // Normalize actionsPosition
      switch(event){
        // In the beginning of a video, 'beforeplay' should trigger playback of prerolls
        // After playback has ended, 'beforeplay' indicates replay of the video, so show prerolls again
        case 'player:video:beforeplay':
          if(!$this.beforeplayHandled||$this.videoEnded){
            $this.beforeplayHandled = true;
            $this.videoEnded = false;
            ret = -1; // "before"
          }
          break;
        // 'ended' triggers postrolls
        case 'player:video:ended':
          ret = 2; // "after"
          $this.videoEnded = true;
          break;
        case 'player:video:play':
        case 'player:video:playing':
          if(!$this.beforeplayHandled){
            ret = -1;
            $this.beforeplayHandled = true;
          }
          break;
      }
      if(typeof ret == "undefined"){
        if($this.beforeplayHandled&&!$this.videoEnded){
          try {
            ret = ct / d;
          }catch(e){
            ret = 0;
          }
        }else{
          if($this.videoEnded){
            ret = 2;
          }else{
            ret = -1;
            $this.ignoreVideoActions = true;
          }
        }
      }
      return ret;
    };
    $this.normalizeActionTimes = function(actions){
      $.each(actions, function(i,action){
        action.normalizedStartTime = (action.start_time == "before" ? -1 : (action.start_time == "after" ? 2 : parseFloat(action.start_time)));
        action.normalizedEndTime = (action.end_time == "before" ? -1 : (action.end_time == "after" ? 2 : parseFloat(action.end_time)));
      });
    };

    // When a video is loaded, load the relevant actions and reset state variables
    Player.bind('player:video:loaded', function(e,v){
      $this._resize();
      if(!$this.currentVideoId||$this.currentVideoId!=(v.type=="clip"?v.photo_id:v.live_id)){
        $this.currentVideoId = (v.type=="clip"?v.photo_id:v.live_id);
        $this.beforeplayHandled = false;
        $this.actionsLoaded = false;
        $this.videoEnded = false;
        Player.set("loadActions", false);
      }
    });

    // EVENTS TO DISPATCHER
    Player.bind('player:video:beforeplay player:video:play player:video:playing player:video:timeupdate player:video:ended player:video:pause', _dispatcher);

    // Return an array of video and video ad actions that are active at the current actionsPosition
    $this.getOverlappingActions = function(action){
      var actions = [];
      $.each(Player.get('videoActions'), function(i,action){
        var actionActive = $this.normalizedActionsPosition>=action.normalizedStartTime && $this.normalizedActionsPosition<=action.normalizedEndTime;
        if(actionActive) actions.push(action);
      });
      return actions;
    };

    var lastWidth = 0;
    var lastHeight = 0;
    // Handle resizing of actions and the module action
    $this._resize = function(){
      var v = Player.get("video");
      if(v && v.video_medium_width){
        // Calculate aspect ratio of the video, so we can resize and position the module container on top of it
        var w = $(window);
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
    Player.getter('videoActions', function(){return Player.get('video').actions||{};});
    Player.getter('actionsPosition', function(){
      switch($this.normalizedActionsPosition) {
        case -1: return "before";
        case 2: return "after";
        default: return $this.normalizedActionsPosition;
      }
      return $this.actionsPosition;
    });
    Player.getter('identityCountdown', function(){return $this.identityCountdown;});
    Player.getter('identityAllowClose', function(){
        return $this.identityAllowClose && Player.get('currentTime') >= $this.identityAllowCloseAfterSeconds;
    });
    Player.getter('identityCountdownText', function(){
      // Format countdown
      try {
        var duration = Player.get("videoElement").getDuration();
        var currentTime = Player.get("videoElement").getCurrentTime();
        var timeLeft = 0;
        if($this.identityAllowCloseAfterSeconds==0||!$this.identityAllowClose){
          timeLeft = Math.round(duration-currentTime);
          if(isNaN(timeLeft)) return '';
          var s = (timeLeft==1 ? $this.identityCountdownTextSingular : $this.identityCountdownTextPlural);
          return s.replace(/\%/img, timeLeft);
        }else{
          timeLeft = Math.round($this.identityAllowCloseAfterSeconds - currentTime);
          if(timeLeft>0){
            var s = (timeLeft==1 ? $this.closeCountdownTextSingular : $this.closeCountdownTextPlural);
            return s.replace(/\%/img, timeLeft);
          }else{
            return '';
          }
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
      if($this.loadingActions || !$this.dispatcherActive) return;
      $this.loadingActions = true;
      $this.actionsLoaded = false;
      $this.container.html("");
      $this.activeActions={};
      var v = Player.get("video");
      if(v.type=="stream"){
        $this.actionsLoaded = true;
        $this.loadingActions = false;
        if($this.queuePlay){
          $this.queuePlay = false;
          Player.set("playing", true);
        }
        Player.fire("player:action:loaded");
        return;
      }
      if(!v.actions||forceLoad) {
        Player.get('api').action.get(
          {
            photo_id:v.photo_id,
            token:v.token,
            player_id: Player.get("player_id"),
            cb: (new Date()).getTime()
          },
          function(data){
            $this.loadingActions = false;
            $this.actionsLoaded = true;
            v.actions = data.actions;
            $this.normalizeActionTimes(v.actions);
            _dispatcher();
            if($this.queuePlay){
              $this.queuePlay = false;
              Player.set("playing", true);
            }
            Player.fire("player:action:loaded");
          },
          Player.fail
        );
      } else {
        $this.normalizeActionTimes(v.actions);
        $this.actionsLoaded = true;
        $this.loadingActions = false;
        if($this.queuePlay){
          $this.queuePlay = false;
          Player.set("playing", true);
        }
        Player.fire("player:action:loaded");
      }
      _dispatcher();
      $this._resize();
    });
    Player.setter("videoActionPlaying", function(vap){
      $this.videoActionPlaying = vap;
    });

    return $this;
  }
);
