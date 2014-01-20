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
    identityCountdown: true,
    identityAllowClose: true,
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
      // TODO: Write `image` show handle making sure image is displayed correctly in the correct aspect ratio
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
      action.container.append(table);
      img.load(function(){
        action.image_width = img.width();
        action.image_height = img.height();
        action.aspect_ratio = action.image_width / action.image_height;
        if(action.aspect_ratio>action.container.width()/action.container.height()){
          img.css({
            width: Math.min(action.container.width(), action.image_width),
            height: "auto",
            visibility: "visible"
          });
        }else{
          img.css({
            width: "auto",
            height: Math.min(action.container.height(), action.image_height),
            visibility: "visible"
          });
        }
      }).attr('src', Player.get("url")+action.image);
    }
    // HANDLER: VIDEO
    $this.showHandlers['video'] = function(action){
      $this.dispatcherActive = false;
      var actions = getOverlappingActions(action.position);
      $.each(actions, function(i,action){
        $this.activeActions[action.action_id] = action;
      });
      $this.VideoHandler(actions, function(){
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
        $this.dispatcherActive = true;
      }, action);
      return false;
    }

    // HANDLER: BANNER
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
          action.image_width = img.width();
          action.image_height = img.height();
          action.aspect_ratio = action.image_width / action.image_height;
          if(action.aspect_ratio>action.container.width()/action.container.height()){
            img.css({
              width: Math.min(action.container.width(), action.image_width),
              height: "auto",
              visibility: "visible"
            });
          }else{
            img.css({
              width: "auto",
              height: Math.min(action.container.height(), action.image_height),
              visibility: "visible"
            });
          }
        }).attr('src', action.image_url);
        $this.reportEvent("impression", true, action);
      }else{
        if(typeof action.ad_url=="undefined"||action.ad_url=="") return;
        $.ajax({
          url: action.ad_url,
          method: "GET",
          dataType: "xml",
          cache: false,
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
      var productParent = $(".product-parent");
      if(productParent.length<1){
        productParent = $("<div></div>").addClass("product-parent").appendTo($this.container);
      }
      if(typeof action.image!='undefined' && action.image!=''){
        var img = $(document.createElement('img')).attr({'src': Player.get("url")+action.image});
        img.appendTo(action.container);
      }
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
      if(!action.animating){
        action.animating = true;
        action.parent.slideUp(200, function(){
          $(this).remove();
          var productParent = $(".product-parent");
          if(productParent.find(".action").length<1){
            productParent.remove();
          }
          action.animating = false;
          delete $this.activeActions[action.action_id];
          delete action.container;
          delete action.parent;
        });
      }
      return true;
    };
    
    // CONTROLLER LISTENING TO PLAYBACK STATE AND DISPATCHING ACTIONS
    var _dispatcher = function(event){
      // We need to get 'currentTime' and 'duration' before checking dispatcherActive, probably
      // because interfacing with Flash's ExternalInterface in some cases is async and therefore
      // may allow other events being fired and possibly changing the value of dispatcherActive
      var ct = Player.get('currentTime');
      var d = Player.get('duration');
      if($this.dispatcherActive != true) {
        return true;
      }
      if(!$this.actionsLoaded){
        if(event=="player:video:beforeplay"){
          $this.queuePlay = true;
        }
        return false;
      }
      // Normalize actionsPosition
      switch(event){
      case 'player:video:beforeplay':
        if(ct==0){
          $this.normalizedActionsPosition = -1; // "before"
        }else{
          $this.normalizedActionsPosition = ct / d;
        }
        break;
      case 'player:video:ended':
        $this.normalizedActionsPosition = 2; // "after"
        break;
      default:
        if(ct!=0||event=="player:video:playing"){
          try {
            $this.normalizedActionsPosition = (ct / d == 1 ? 2 : ct / d);
          }catch(e){
            $this.normalizedActionsPosition = 0;
          }
        }else{
          $this.normalizedActionsPosition = -1;
          $this.ignoreVideoActions = true;
        }
      }
      $this.dummyElement = $(document.createElement('div')).css({backgroundColor:'rgba(0,0,0,.666)'});
      // Dispatch actions
      $.each(Player.get('videoActions'), function(i,action){
        // Figure out if the action should be active or not
        var actionActive = $this.normalizedActionsPosition>=action.normalizedStartTime && $this.normalizedActionsPosition<=action.normalizedEndTime && !action.failed;
        var actionActive = (actionActive && (!action.pause_mode || action.pause_mode!="only_on_pause" || !Player.get("playing")));
        // TODO: Fire show & hide handlers listed in the beginning of this file
        if(actionActive && !$this.activeActions[action.action_id]) {
          if((action.type=="video"||action.type=="ad")&&$this.ignoreVideoActions) return;

          // Ad action to the list of active actions
          $this.activeActions[action.action_id] = action;

          // Activate action by adding a container and calling the show handler
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
            if(/^\$/.test(action.link)){
              screen.click({command: action.link}, function(e){
                Player.runCommand(e);
                e.preventDefault();
              });
            }else{
              screen.attr({href:action.link, target:action.link_target||'_new'}).click(function(){
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
          if(typeof(action.background_color)!='undefined' && action.background_color!='' && action.background_color != "transparent") {
            var rgbaSupport = /^rgba/.test($this.dummyElement.css('backgroundColor'));
            var alpha = action.background_opacity || 0.8;
            if(rgbaSupport) {
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
            }else{
              if(/MSIE/.test(navigator.userAgent)){
                var hexTransparency = Math.floor(alpha*255).toString(16).substr(0,2);
                var rawColor = action.background_color.substr(1);
                var grad = "#"+hexTransparency+rawColor;
                parent.css({
                  "background-color":"transparent",
                  "zoom":"1",
                  "filter":"progid:DXImageTransform.Microsoft.gradient(startColorstr="+grad+",endColorstr="+grad+")"
                });
              }else{
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

          // Ad action to the list of active actions
          //$this.activeActions[action.action_id] = action;
          // Possibly pause video (important to be done after action has been added to activeActions
          // because of async behaviour when using ExternalInterface)
          if(typeof action.pause_mode != "undefined" && action.pause_mode == "pause_playback"){
            Player.set("playing", false);
          }

          if($this.showHandlers[action.type]) {
            return $this.showHandlers[action.type](action);
          }
          
        } else if(!actionActive && $this.activeActions[action.action_id]) {
          // Deactivate action by calling hide handler and then unloading the container
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
      return true;
    }

    Player.bind('player:video:loaded', function(e,v){
      Player.set("loadActions", true);
    });

    // EVENTS TO DISPATCHER
    Player.bind('player:video:beforeplay player:video:play player:video:playing player:video:timeupdate player:video:ended player:video:pause', _dispatcher);
    
    var getOverlappingActions = function(action){
      var actions = [];
      $.each(Player.get('videoActions'), function(i,action){
        var actionActive = $this.normalizedActionsPosition>=action.normalizedStartTime && $this.normalizedActionsPosition<=action.normalizedEndTime;
        if(actionActive) actions.push(action);
      });
      return actions;
    };
    
    var _resize = function(){
      var v = Player.get("video");
      try{
        var w = $(window);
        var wr = w.width()/w.height();
        var vr = v.video_medium_width / v.video_medium_height;
        if(vr>wr){
          $this.container.css({
            "width":""+w.width()+"px",
            "height":""+(w.width()/vr)+"px",
            "margin-top":""+(w.height()-w.width()/vr)/2+"px",
            "margin-left":0
          });
        }else{
          $this.container.css({
            "height":""+w.height()+"px",
            "width":""+(w.height()*vr)+"px",
            "margin-top":0,
            "margin-left":""+(w.width()-w.height()*vr)/2+"px"
          });
        }
      }catch(e){}
      $.each($this.activeActions||[], function(i, action){
        if(action.type=="image"||action.type=="banner"){
          var img = action.container.find("img");
          if(action.aspect_ratio>action.container.width()/action.container.height()){
            img.css({
              width: Math.min(action.container.width(), action.image_width),
              height: "auto"
            });
          }else{
            img.css({
              width: "auto",
              height: Math.min(action.container.height(), action.image_height)
            });
          }
        }
        if(action.type=="text"&&/MSIE 7/.test(navigator.userAgent)){
          window.setTimeout(function(){
            action.container.outerHeight(action.parent.height());
          },10);
        }
      });
      window.setTimeout(function(){
        $(".action-text .action-content").css({fontSize:($this.container.width()/640*100)+'%'});
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

    // VERIFY AND RETRIEVE ACTIONS DATA
    // When a video is loaded, reset the state of the Actions
    // Also this, is where we may need to populate the `actions` property of the video object
    Player.setter("loadActions", function(forceLoad){
      $this.container.html("");
      $this.activeActions={};
      var v = Player.get("video");
      if(!$this.dispatcherActive||v.type=="stream") return;
      if(!v.actions||forceLoad) {
        $this.actionsLoaded = false;
        Player.get('api').action.get(
          {photo_id:v.photo_id, token:v.token, cb: (new Date()).getTime()},
          function(data){
            v.actions = data.actions;
            $.each(v.actions, function(i,action){
              action.normalizedStartTime = (action.start_time == "before" ? -1 : (action.start_time == "after" ? 2 : parseFloat(action.start_time)));
              action.normalizedEndTime = (action.end_time == "before" ? -1 : (action.end_time == "after" ? 2 : parseFloat(action.end_time)));
            });
            $this.actionsLoaded = true;
            _dispatcher();
            if($this.queuePlay){
              $this.queuePlay = false;
              Player.set("playing", true);
            }
          },
          Player.fail
        );
      } else {
        $.each(v.actions, function(i,action){
          action.normalizedStartTime = (action.start_time == "before" ? -1 : (action.start_time == "after" ? 2 : parseFloat(action.start_time)));
          action.normalizedEndTime = (action.end_time == "before" ? -1 : (action.end_time == "after" ? 2 : parseFloat(action.end_time)));
        });
        $this.actionsLoaded = true;
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
        Player.fire("player:action:click", action);
        window.open(action.link, (typeof action.link_target != "undefined" ? action.link_target : "_blank"));
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
          }else{
            $this.loadAd(action);
          }
        }
      }else{
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
      $.ajax({
        url: action.ad_url||"fail",
        method: "GET",
        dataType: "xml",
        cache: false,
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
      var ad = VAST.find("Ad InLine").eq(0);
      if (ad.length < 1) return $this.playNextVideoAction();
      
      // Check if ad contains a video of type 'video/mp4'
      var adVideoUrl = ad.find("Creative Linear MediaFile[type='video/mp4']").eq(0);
      if (adVideoUrl.length < 1) return $this.playNextVideoAction();
      action.adVideoUrl = adVideoUrl.text();
      
      // Playback events to be tracked and reported
      action.events = [];
      var impressions = ad.find("Impression");
      $.each(impressions, function(i,impression){
        action.events.push({
          "name": "impression",
          "url": $(impression).text()
        });
      });
      var trackingevents = ad.find("Creative Linear").eq(0).find("TrackingEvents Tracking");
      $.each(trackingevents, function(i, event){
        var $event = $(event);
        action.events.push({
          "name": $event.attr("event"),
          "url": $event.text()
        });
      });
      
      var clickthrough = ad.find("Creative Linear").eq(0).find("VideoClicks ClickThrough").eq(0);
      if(clickthrough.length>0) action.link = clickthrough.text();
    
      // The ad is loaded, initiate playback for it again
      action.adLoaded = true;
      $this.currentVideoActionIndex -= 1;
      $this.playNextVideoAction();
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
        dataType: "eventReport"
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
      if(e=="ended"){
        $this.playNextVideoAction();
      }
    };
    $this.stealEingebaut = function(){
      Player.set("playing", false);
      $this.originalEingebaut = {};
      $this.eingebaut = Player.get("videoElement");
      $this.originalEingebaut.callback = $this.eingebaut.callback;
      $this.originalEingebaut.src = $this.eingebaut.getSource();
      if($this.eingebaut.floatingPoster) $this.eingebaut.floatingPoster.hide();
      $this.eingebaut.callback = $this.actionsEingebautCallback;
      $this.eingebaut.controller = 'actions';
      $this.eingebaut.container.parent().css({ "z-index":200});
      $this.eingebaut.container.css({ "z-index":200});
      $this.container.css({"position":"static"});
    };
    
    $this.restoreEingebaut = function(){
      if ($this.switchedToFlash) {
        $this.loadEingebaut("html5", $this.originalEingebaut.callback);
        $this.eingebaut = Player.get("videoElement");
        $this.switchedToFlash = false;
      }
      $this.eingebaut.callback = $this.originalEingebaut.callback;
      $this.eingebaut.container.css({ "z-index":""});
      $this.eingebaut.container.parent().css({"z-index":""});
      $this.eingebaut.setSource($this.originalEingebaut.src);
      $this.eingebaut.controller = '';
      $this.container.css({"position":""});
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



