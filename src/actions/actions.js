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
    identityCountdownTextSingular: "This advertisement will end in % second",
    identityCountdownTextPlural: "This advertisement will end in % seconds"
  }, 
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);
    $this.showHandlers = {};
    $this.hideHandlers = {};
    $this.dispatcherActive = true;
    $this.activeActions = {};
    $this.activeVideoActions = [];
    $this.currentVideoActionIndex = -1;
    $this.normalizedActionsPosition = -1; // (-1 for "before", relative time from 0 to 1 during playback, 2 for "after")
    // Build default properties and merge in player settings
    Player.bind('player:settings', function(){
      PlayerUtilities.mergeSettings($this, ['identityCountdown', 'identityAllowClose', 'identityCountdownTextSingular', 'identityCountdownTextPlural']);
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
    //$this.container.on("touchstart", function(e){
    //  e.stopPropagation();
    //});

    // HANDLERS FOR ACTION TYPES
    // HANDLER: TEXT
    $this.showHandlers['text'] = function(action){
      // TODO: Make sure text scales well in text and html boxes
      var parentFontSize = action.font_size || 11;
      action.parent.css({"font-size": parentFontSize+'px'});
      action.text = action.text.replace(/\n/g, '<br />');
      var table = $("<table><tr><td></td></tr></table>");
      var cell = table.find("td");
      cell.append(action.text);
      if(action.valign&&action.valign!="top"){
        cell.css({
          "vertical-align": (action.valign=="center"?"middle":action.valign)
        })
      }
      if(action.halign&&action.halign!="left"){
        cell.css({
          "text-align": action.halign
        })
      }
      action.container.html(table);
      _resize();
    }
    // HANDLER: HTML
    $this.showHandlers['html'] = function(action){
      action.container.html(action.html);
    }
    // HANDLER: IMAGE
    $this.showHandlers['image'] = function(action){
      // Create image element and a table to display it in
      var img = $(document.createElement('img'));
      var table = $("<table><tr><td></td></tr></table>");
      var cell = table.find("td");
      // Set alignments of cell content
      if(action.valign && action.valign != "center"){
        cell.css({"vertical-align": action.valign});
      }
      if(action.halign && action.halign != "center"){
        cell.css({"text-align": action.halign});
      }
      cell.append(img);
      action.container.append(table);
      img.load(function(){
        // When image is loaded, save the original dimensions for use when scaling
        action.image_width = img.get(0).clientWidth;
        action.image_height = img.get(0).clientHeight;
        action.aspect_ratio = action.image_width / action.image_height;
        if(action.aspect_ratio>action.container.get(0).clientWidth/action.container.get(0).clientHeight){
          img.css({
            width: Math.min(action.container.get(0).clientWidth, action.image_width),
            height: "auto",
            visibility: "visible"
          });
        }else{
          img.css({
            width: "auto",
            height: Math.min(action.container.get(0).clientHeight, action.image_height),
            visibility: "visible"
          });
        }
      }).attr('src', Player.get("url")+action.image);
    }
    // Handlers for video and video ad actions does the same basic thing:
    // Disable the dispatcher, gathers all video actions to be shown at this actionsPosition,
    // and let the VideoHandler-method take care of playback flow. Afterwards, control is
    // handed back to the dispatcher.
    // HANDLER: VIDEO
    $this.showHandlers['video'] = function(action){
      $this.dispatcherActive = false;
      var actions = getOverlappingActions(action.position);
      $.each(actions, function(i,action){
        $this.activeActions[action.action_id] = action;
      });
      $this.VideoHandler(actions, function(){
        action.parent.hide(); // Hide action container when playback of video actions is done
        $this.dispatcherActive = true;
      }, action);
      return false;
    }
    // HANDLER: AD
    $this.showHandlers['ad'] = function(action){
      $this.dispatcherActive = false;
      var actions = getOverlappingActions(action.position);
      $.each(actions, function(i,action){
        $this.activeActions[action.action_id] = action;
      });
      $this.VideoHandler(actions, function(){
        action.parent.hide(); // Hide action container when playback of video actions is done
        $this.dispatcherActive = true;
      }, action);
      return false;
    }

    // HANDLER: BANNER
    // This handler mimics the showHandler for action type "image" expect it makes sure that the VAST feed
    // has been loaded and parsed, before creating the image element and its container
    $this.showHandlers['banner'] = function(action){
      if(action.parsed){
        action.reportedEvents = [];
        var img = $(document.createElement('img'));
        var table = $("<table><tr><td></td></tr></table>");
        var cell = table.find("td");
        if(action.valign && action.valign != "center"){
          cell.css({"vertical-align": action.valign});
        }
        if(action.halign && action.halign != "center"){
          cell.css({"text-align": action.halign});
        }
        cell.append(img);
        if($this.identityAllowClose){
          cell.wrapInner("<span class='banner-wrap'></span>");
          $("<div class='close-button'></div>").click(function(){action.container.remove();}).appendTo(cell.find(".banner-wrap"));
        }
        action.container.append(table);
        img.load(function(){
          action.image_width = img.get(0).clientWidth;
          action.image_height = img.get(0).clientHeight;
          action.aspect_ratio = action.image_width / action.image_height;
          if(action.aspect_ratio>action.container.get(0).clientWidth/action.container.get(0).clientHeight){
            img.css({
              width: Math.min(action.container.get(0).clientWidth, action.image_width),
              height: "auto",
              visibility: "visible"
            });
          }else{
            img.css({
              width: "auto",
              height: Math.min(action.container.get(0).clientHeight, action.image_height),
              visibility: "visible"
            });
          }
        }).attr('src', action.image_url);
        $this.reportEvent("impression", true, action);
        action.parsed = false // Force reload of the ad, if the action is shown again
      }else{
        if(typeof action.ad_url=="undefined"||action.ad_url=="") return;
        action.ad_url_replaced = action.ad_url.replace(/\[timestamp\]|\[random\]/g, (new Date()).getTime()).replace(/\[referrer\]/g, document.referrer);
        $.ajax({
          url: action.ad_url_replaced,
          method: "GET",
          dataType: "xml",
          cache: false,
          xhrFields: {
            withCredentials: true
          },
          success: function(data){
            var ad = $(data).find("VAST Ad InLine").eq(0);
            if(ad.length < 1){
              action.failed = true;
              return;
            }
            var NonLinear = ad.find("NonLinear").eq(0);
            if(NonLinear.length < 1){
              action.failed = true;
              return;
            }
            action.image_url = NonLinear.find("StaticResource").text();
            var clickthrough = NonLinear.find("NonLinearClickThrough");
            if(clickthrough.length>0) action.clickthrough = clickthrough.text();
            
            action.events = [];
            var impressions = ad.find("Impression");
            $.each(impressions, function(i,impression){
              action.events.push({
                "name": "impression",
                "url": $(impression).text()
              });
            });
            var trackingevents = NonLinear.find("TrackingEvents Tracking");
            $.each(trackingevents, function(i, event){
              var $event = $(event);
              action.events.push({
                "name": $event.attr("event"),
                "url": $event.text()
              });
            });
            
            action.parsed = true;
            $this.showHandlers['banner'](action);
          },
          error: function(data){
            action.failed = true;
          }
        });
      }
    };

    // HANDLER: PRODUCT
    $this.showHandlers['product'] = function(action){
      // All product actions are placed inside the same parent element to allow stacking
      // Create the parent element, if it does not already exist
      var productParent = $(".product-parent");
      if(productParent.length<1){
        productParent = $("<div></div>").addClass("product-parent").appendTo($this.container);
      }
      // Place product image inside the action container
      if(typeof action.image!='undefined' && action.image!=''){
        var img = $(document.createElement('img')).attr({'src': Player.get("url")+action.image});
        img.appendTo(action.container);
      }
      // Append product name and description
      if(typeof action.product_name!='undefined' && action.product_name!=''){
        var productName = $("<table><tr><td><div class='product-wrap'></div></td></tr></table>").addClass("product-info").appendTo(action.container);
        var wrap = productName.find(".product-wrap");
        wrap.append( $("<span></span>").addClass("product-name").html(action.product_name) );
        if(typeof action.product_text!='undefined' && action.product_text!='') {
          wrap.append("<br />");
          wrap.append( $("<span></span>").addClass("product-description").html(action.product_text) );
        }
        $("<div></div>").addClass("product-triangle").appendTo(action.container);
      }
      action.parent.appendTo(productParent).css({"display":"none"});
      action.parent.slideDown(200);
    };
    $this.hideHandlers['product'] = function(action){
      // Hide the acition with an animation
      action.parent.stop().slideUp(200, function(){
        // Remove the action completely
        $(this).remove();
        // Remove the parent element, if it is empty
        var productParent = $(".product-parent");
        if(productParent.find(".action").length<1){
          productParent.remove();
        }
        delete $this.activeActions[action.action_id];
        delete action.container;
        delete action.parent;
      });
      // Return true, so the dispatcher knows that this hideHandler is in charge of removing
      // the action and its containers
      return true;
    };

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
      var ve = Player.get("videoElement");
      var startTime = (ve&&ve.getStartTime)?Player.get("videoElement").getStartTime()||false:false;
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
      // Normalize actionsPosition
      switch(event){
        // In the beginning of a video, 'beforeplay' should trigger playback of prerolls
        // After playback has ended, 'beforeplayer' indicates replay of the video, so show prerolls again
        case 'player:video:beforeplay':
          if(!$this.beforeplayHandled||$this.videoEnded){
            $this.beforeplayHandled = true;
            $this.videoEnded = false;
            $this.normalizedActionsPosition = -1; // "before"
          }else{
            $this.normalizedActionsPosition = ct / d;
          }
          break;
        // 'ended' triggers postrolls
        case 'player:video:ended':
          $this.normalizedActionsPosition = 2; // "after"
          $this.videoEnded = true;
          break;
        default:
          // If currentTime is bigger than 0 (or we receive an event confirming that playback has started),
          // make sure that prerolls have been handled, and set actionsPosition between 0 and 1
          // If $this.videoEnded, set actionsPosition to 2 (until next beforeplay event)
          if((ct!=0||(startTime!=false&&startTime!=0)||event=="player:video:playing"||event=="player:video:play")&&!$this.videoEnded){
            if($this.beforeplayHandled){
              try {
                if (ct/d != 1) {
                  $this.normalizedActionsPosition = ct / d;
                }
              }catch(e){
                $this.normalizedActionsPosition = 0;
              }
            }else{
              // if beforeplay has not been handled, do so now
              $this.normalizedActionsPosition = -1;
              $this.beforeplayHandled = true;
            }
          }else{
            if(!$this.videoEnded){
              // if playback has not yet started, show relevant static actions, but don't play prerolls just yet
              $this.normalizedActionsPosition = -1;
              $this.ignoreVideoActions = true;
            }else{
              // If playback has ended, keep actionsPosition at 2, even though currentTime may be 0
              $this.normalizedActionsPosition = 2;
            }
          }
      }      

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
        var actionActive = (actionActive && (!action.pause_mode || action.pause_mode!="only_on_pause" || !playing));

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
      Player.fire("player:action:dispatched");
      return true;
    }

    // When a video is loaded, load the relevant actions and reset state variables
    Player.bind('player:video:loaded', function(e,v){
      _resize();
      if(!$this.currentVideoId||$this.currentVideoId!=(v.type=="clip"?v.photo_id:v.live_id)){
        $this.currentVideoId = (v.type=="clip"?v.photo_id:v.live_id);
        $this.beforeplayHandled = false;
        $this.actionsLoaded = false;
        $this.videoEnded = false;
        Player.set("loadActions", true);
      }
    });

    // EVENTS TO DISPATCHER
    Player.bind('player:video:beforeplay player:video:play player:video:playing player:video:timeupdate player:video:ended player:video:pause', _dispatcher);
    
    // Return an array of video and video ad actions that are active at the current actionsPosition
    var getOverlappingActions = function(action){
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
    var _resize = function(){
      var v = Player.get("video");
      if(typeof v != "undefined"){
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
    $(window).resize(_resize);
    
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
    Player.getter('identityAllowClose', function(){return $this.identityAllowClose;});
    Player.getter('identityCountdownText', function(){
      // Format countdown
      try {
        var duration = $this.eingebaut.getDuration();
        var currentTime = $this.eingebaut.getCurrentTime();
        var timeLeft = Math.round(duration-currentTime);
        if(isNaN(timeLeft)) return '';
        var s = (timeLeft==1 ? $this.identityCountdownTextSingular : $this.identityCountdownTextPlural);
        return s.replace(/\%/img, timeLeft);
      }catch(e){
        return '';
      } 
    });
    Player.getter('hasLink', function(){
      return typeof $this.activeVideoActions[$this.currentVideoActionIndex].link != 'undefined';
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
            $.each(v.actions, function(i,action){
              action.normalizedStartTime = (action.start_time == "before" ? -1 : (action.start_time == "after" ? 2 : parseFloat(action.start_time)));
              action.normalizedEndTime = (action.end_time == "before" ? -1 : (action.end_time == "after" ? 2 : parseFloat(action.end_time)));
            });
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
        $.each(v.actions, function(i,action){
          action.normalizedStartTime = (action.start_time == "before" ? -1 : (action.start_time == "after" ? 2 : parseFloat(action.start_time)));
          action.normalizedEndTime = (action.end_time == "before" ? -1 : (action.end_time == "after" ? 2 : parseFloat(action.end_time)));
        });
        $this.actionsLoaded = true;
        $this.loadingActions = false;
        if($this.queuePlay){
          $this.queuePlay = false;
          Player.set("playing", true);
        }
        Player.fire("player:action:loaded");
      }
      $this.currentVideoActionIndex = -1;
      _dispatcher();
      _resize();
    });
    Player.setter("videoActionPlaying", function(vap){
      $this.videoActionPlaying = vap;
    });
    Player.setter('clickAction', function(){
      var action = $this.activeVideoActions[$this.currentVideoActionIndex];
      if(typeof action.link != 'undefined' && action.link != ""){
        if(typeof action.clicked == "undefined" || !action.clicked) {
          Player.fire("player:action:click", action);
          window.open(action.link, (typeof action.link_target != "undefined" ? action.link_target : "_blank"));
          $this.reportEvent("ClickTracking");
          Player.set("playing", false);
          action.clicked = true;
        }else{
          Player.set("playing", true);
          action.clicked = false;
        }
      }
    });
    Player.setter('closeIdentity', function(){
      // Close clip
      Player.set("playing", false);
      $this.reportEvent("close");
      $this.playNextVideoAction();
    });
    
    
    // UTILITY FUNCTION FOR CONTROLLING PLAYBACK STATE 
    $this.VideoHandler = function(actions, callback, initialAction){
      $this.activeVideoActions = [];
      $this.currentVideoActionIndex = -1;
      $this.callback = callback;
      $.each(actions, function(i,action){
        if(action.type=='video' || action.type=='ad') {
          if(!action.container) action.container = initialAction.container;
          if(!action.parent) action.parent = initialAction.parent;
          $this.activeVideoActions.push(action);
        }
      });
      $this.playNextVideoAction();
    }
    
    $this.playNextVideoAction = function(){
      // Empty all video action containers
      $.each($this.activeVideoActions, function(i, action){
        if(action.container) action.container.html('');
      });
      // Check for further video actions and play them
      $this.currentVideoActionIndex += 1;
      if($this.activeVideoActions.length > $this.currentVideoActionIndex){
        // We have videos to play
        Player.set("videoActionPlaying", true);
        var action = $this.activeVideoActions[$this.currentVideoActionIndex];
        if(!$this.eingebaut || !$this.eingebaut.controller || $this.eingebaut.controller=='') $this.stealEingebaut();
        if(!$this.eingebaut.canPlayType("video/mp4") && Player.get("displayDevice") != "flash"){
          $this.playerReady = false;
          if(!$this.loadEingebaut) $this.loadEingebaut = Player.get("eingebautConstructor");
          $this.loadEingebaut("flash", $this.actionsEingebautCallback);
          $this.eingebaut = Player.get("videoElement");
          $this.eingebaut.controller = 'actions';
          $this.switchedToFlash = true;
          return;
        }
        // Build url of the video action
        if(action.type=='video'){
          var videoUrl = Player.get("url")+action.video;
          // Play the video action
          $this.eingebaut.setSource(videoUrl);
          Player.set("playing", true);
        }else if(action.type=='ad'){
          if(action.adLoaded){
            action.reportedEvents = [];
            $this.eingebaut.setSource(action.adVideoUrl);
            Player.set("playing", true);
            action.adLoaded = false; // Force reload of ad, if the action is shown again
          }else{
            $this.loadAd(action);
          }
        }
      }else{
        Player.set("videoActionPlaying", false);
        // No more videos, continue to content video
        if($this.activeVideoActions[0].normalizedStartTime==-1){
          $this.restoreEingebaut();
          $this.callback();
          Player.set("playing", true);
        }else{
          $this.restoreEingebaut();
          $this.callback();
          Player.fire("player:video:ended");
        }
      }
    };

    $this.loadAd = function(action){
      Player.set("playing", false);
      action.ad_url_replaced = action.ad_url.replace(/\[timestamp\]|\[random\]/g, (new Date()).getTime()).replace(/\[referrer\]/g, document.referrer);
      $.ajax({
        url: action.ad_url_replaced||"fail",
        method: "GET",
        dataType: "xml",
        cache: false,
        xhrFields: {
          withCredentials: true
        },
        success: function(data){
          $this.parseVastResponse(data, action);
        },
        error: function(data){
          $this.playNextVideoAction();
        }
      });
    };

    $this.parseVastResponse = function(data, action){
      // Check for correct version of VAST
      var VAST = $(data).find("VAST");
      if (VAST.length < 1 || (VAST.attr("version") != "2.0" && VAST.attr("version") != "2.0.1")) return $this.playNextVideoAction();

      // Check if feed contains an ad
      var ad = VAST.find("Ad").eq(0);
      var inline = ad.find("InLine").eq(0);
      if (ad.length < 1) return $this.playNextVideoAction();

      // Check if feed is a wrapper
      var wrapper = ad.find("Wrapper VASTAdTagURI").eq(0);
      var isWrapper = false;
      if (wrapper.length > 0) {
        isWrapper = true;
      }else {
        // Check if ad contains a video of type 'video/mp4'
        var adVideoUrl = inline.find("Creative Linear MediaFile[type='video/mp4']").eq(0);
        if (adVideoUrl.length < 1) return $this.playNextVideoAction();
        action.adVideoUrl = adVideoUrl.text();
      }

      // Playback events to be tracked and reported
      if (typeof action.events == "undefined") action.events = [];
      var impressions = ad.find("Impression");
      $.each(impressions, function(i,impression){
        if($(impression).text()!=""){
          action.events.push({
            "name": "impression",
            "url": $(impression).text()
          });
        }
      });
      var trackingevents = ad.find("Creative Linear").eq(0).find("TrackingEvents Tracking");
      $.each(trackingevents, function(i, event){
        var $event = $(event);
        if ($event.text()!=""){
          action.events.push({
            "name": $event.attr("event"),
            "url": $event.text()
          });
        }
      });

      var clickthrough = ad.find("Creative Linear").eq(0).find("VideoClicks ClickThrough").eq(0);
      if(clickthrough.length>0) action.link = clickthrough.text();

      var clicktracking = ad.find("Creative Linear").eq(0).find("VideoClicks ClickTracking");
      $.each(clicktracking,function(i, trackinguri){
          var $trackinguri = $(trackinguri);
          if($trackinguri.text()!=""){
              action.events.push({
                  "name": "ClickTracking",
                  "url": $trackinguri.text()
              });
          }
      });

      // If this is a wrapper, request next url
      if (isWrapper) {
        $.ajax({
          url: wrapper.text(),
          method: "GET",
          dataType: "xml",
          cache: false,
          xhrFields: {
            withCredentials: true
          },
          success: function(data){
            $this.parseVastResponse(data, action);
          },
          error: function(data){
            $this.playNextVideoAction();
          }
        });
      } else {
        // The ad is loaded, initiate playback for it again
        action.adLoaded = true;
        $this.currentVideoActionIndex -= 1;
        $this.playNextVideoAction();
      }
    };

    $this.reportEvent = function(event, once, a){
      var action = a||$this.activeVideoActions[$this.currentVideoActionIndex];
      if(!action.events) return;
      var reported = false;
      if(once){
        $.each(action.reportedEvents, function(i,e){
          if(e==event) reported = true;
        });
      }
      
      // If 'start' is already imported, report 'resume' instead
      if(event=='start' && reported){
        event = 'resume';
        once = false;
      }
      
      if(!reported || !once){
        $.each(action.events, function(i,e){
          if(e.name==event) {
            $this.ajaxReport(e.url);
          }
        });
        action.reportedEvents.push(event);
      }
    };
    
    $this.ajaxReport = function(url){
      $.ajax({
        url: url,
        dataType: "eventReport",
        xhrFields: {
          withCredentials: true
        }
      });
    };
        
    Player.bind("player:action:play", function(){
      $this.reportEvent("impression", true);
      $this.reportEvent("creativeView", true);
      $this.reportEvent("start", true);
      if (Player.get("fullscreen")) {$this.reportEvent("fullscreen", true);}
      $this.lastVolume = Player.get("volume");
      if ($this.lastVolume == 0) {$this.reportEvent("mute", true);}
    });
        
    Player.bind("player:action:pause", function(){
      var remaining = Player.get("duration") - Player.get("currentTime");
      if (remaining > 1) {
        $this.reportEvent("pause", false);
      }
    });
        
    Player.bind("player:action:ended", function(){
      $this.reportEvent("complete");
    });
        
    Player.bind("player:action:timeupdate", function(){
      // Update countdown
      var action = $this.activeVideoActions[$this.currentVideoActionIndex];
      $this.render(function(){}, 'actions/actions-video.liquid', action.container);
      // Report playthrough
      var playthrough = Player.get("currentTime") / Player.get("duration");
      if (playthrough > 0.75) {
        $this.reportEvent("thirdQuartile", true);
      } else if (playthrough > 0.5) {
        $this.reportEvent("midpoint", true);
      } else if (playthrough > 0.25) {
        $this.reportEvent("firstQuartile", true);
      }
    });
        
    Player.bind("player:action:volumechange", function(){
      var currentVolume = Player.get("volume");
      if ($this.lastVolume == 0 && currentVolume != 0) {
        $this.reportEvent("unmute", false);
      } else if ($this.lastVolume != 0 && currentVolume == 0) {
        $this.reportEvent("mute", false);
      }
      $this.lastVolume = currentVolume;
    });
        
    Player.bind("player:action:enterfullscreen", function(){
      $this.reportEvent("fullscreen", true);
      $this.reportEvent("expand", false);
    });
    Player.bind("player:action:leavefullscreen", function(){
      $this.reportEvent("collapse");
    });
    
    $this.actionsEingebautCallback = function(e){
      Player.fire("player:action:"+e);
      if(e=='ready' && !$this.playerReady){
        $this.playerReady = true;
        $this.currentVideoActionIndex -= 1;
        $this.playNextVideoAction();
      }
      if(e=="ended" || e=="error"){
        $this.playNextVideoAction();
      }
    };
    $this.stealEingebaut = function(){
      Player.set("playing", false);
      $this.originalEingebaut = {};
      $this.eingebaut = Player.get("videoElement");
      $this.originalEingebaut.callback = $this.eingebaut._callback;
      $this.originalEingebaut.src = $this.eingebaut.getSource();
      $this.originalEingebaut.background = $this.eingebaut.container.css("background-image");
      if($this.eingebaut.floatingPoster) $this.eingebaut.floatingPoster.hide();
      $this.eingebaut._callback = $this.actionsEingebautCallback;
      $this.eingebaut.controller = 'actions';
      $this.eingebaut.container.parent().css({ "z-index":200});
      $this.eingebaut.container.css({ "z-index":200,"background-image":"none"});
      $this.container.css({"position":"static"});
    };
    
    $this.restoreEingebaut = function(){
      if ($this.switchedToFlash) {
        $this.loadEingebaut("html5", $this.originalEingebaut.callback);
        $this.eingebaut = Player.get("videoElement");
        $this.switchedToFlash = false;
      }
      $this.eingebaut._callback = $this.originalEingebaut.callback;
      $this.eingebaut.container.css({ "z-index":"", "background-image":$this.originalEingebaut.background});
      $this.eingebaut.container.parent().css({"z-index":""});
      $this.eingebaut.setSource($this.originalEingebaut.src);
      $this.eingebaut.controller = '';
      $this.container.css({"position": ""});
      // IE9 has a weird bug where restoring z-index and position doesn't render .video-display correctly
      // This fix forces the browser to rerender the element
      if( /MSIE 9/.test(navigator.userAgent) ) {
        $(".video-display").css({"position":"relative"});
        window.setTimeout(function(){
          $(".video-display").css({"position": "absolute"});
        }, 500);
      }
    };

    return $this;
  }
);

// Enable cross domain ajax calls in IE8+9
function checkIEAjaxFallback(){
  // jQuery.XDomainRequest.js
  // Author: Jason Moon - @JSONMOON
  // IE8+
  if (!jQuery.support.cors && jQuery.ajaxTransport && window.XDomainRequest) {
    var httpRegEx = /^https?:\/\//i;
    var getOrPostRegEx = /^get|post$/i;
    var sameSchemeRegEx = new RegExp('^'+location.protocol, 'i');
    var htmlRegEx = /text\/html/i;
    var jsonRegEx = /\/json/i;
    var xmlRegEx = /\/xml/i;

    // ajaxTransport exists in jQuery 1.5+
    jQuery.ajaxTransport('text html xml json', function(options, userOptions, jqXHR){
      // XDomainRequests must be: asynchronous, GET or POST methods, HTTP or HTTPS protocol, and same scheme as calling page
      if (options.crossDomain && options.async && getOrPostRegEx.test(options.type) && httpRegEx.test(options.url) && sameSchemeRegEx.test(options.url)) {
        var xdr = null;
        var userType = (userOptions.dataType||'').toLowerCase();
        return {
          send: function(headers, complete){
            xdr = new XDomainRequest();
            if (/^\d+$/.test(userOptions.timeout)) {
              xdr.timeout = userOptions.timeout;
            }
            xdr.ontimeout = function(){
              complete(500, 'timeout');
            };
            xdr.onload = function(){
              var allResponseHeaders = 'Content-Length: ' + xdr.responseText.length + '\r\nContent-Type: ' + xdr.contentType;
              var status = {
                code: 200,
                message: 'success'
              };
              var responses = {
                text: xdr.responseText
              };
              try {
                if (userType === 'html' || htmlRegEx.test(xdr.contentType)) {
                  responses.html = xdr.responseText;
                } else if (userType === 'json' || (userType !== 'text' && jsonRegEx.test(xdr.contentType))) {
                  try {
                    responses.json = jQuery.parseJSON(xdr.responseText);
                  } catch(e) {
                    status.code = 500;
                    status.message = 'parseerror';
                    //throw 'Invalid JSON: ' + xdr.responseText;
                  }
                } else if (userType === 'xml' || (userType !== 'text' && xmlRegEx.test(xdr.contentType))) {
                  var doc = new ActiveXObject('Microsoft.XMLDOM');
                  doc.async = false;
                  try {
                    doc.loadXML(xdr.responseText);
                  } catch(e) {
                    doc = undefined;
                  }
                  if (!doc || !doc.documentElement || doc.getElementsByTagName('parsererror').length) {
                    status.code = 500;
                    status.message = 'parseerror';
                    throw 'Invalid XML: ' + xdr.responseText;
                  }
                  responses.xml = doc;
                }
              } catch(parseMessage) {
                throw parseMessage;
              } finally {
                complete(status.code, status.message, responses, allResponseHeaders);
              }
            };
            // set an empty handler for 'onprogress' so requests don't get aborted
            xdr.onprogress = function(){};
            xdr.onerror = function(){
              complete(500, 'error', {
                text: xdr.responseText
              });
            };
            var postData = '';
            if (userOptions.data) {
              postData = (jQuery.type(userOptions.data) === 'string') ? userOptions.data : jQuery.param(userOptions.data);
            }
            xdr.open(options.type, options.url);
            xdr.send(postData);
          },
          abort: function(){
            if (xdr) {
              xdr.abort();
            }
          }
        };
      }
    });
  }
}

checkIEAjaxFallback();

// Register custom transpart type for reporting events
// Used for simply requesting a cross domain url and ignoring whether the request succeeds or fails
$.ajaxTransport( "eventReport", function( s ) {
  if ( s.type === "GET" && s.async ) {
    var image;
    return {
      send: function( _ , callback ) {
        image = new Image();
        function done( status ) {
          if ( image ) {
            var statusText = ( status === 200 ) ? "success" : "error",
              tmp = image;
            image = image.onreadystatechange = image.onerror = image.onload = null;
            callback( status, statusText, { image: tmp } );
          }
        }
        image.onreadystatechange = image.onload = function() {
          done( 200 );
        };
        image.onerror = function() {
          done( 404 );
        };
        image.src = s.url;
      },
      abort: function() {
        if ( image ) {
          image = image.onreadystatechange = image.onerror = image.onload = null;
        }
      }
    };
  }
});



