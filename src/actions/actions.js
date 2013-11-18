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
    identityAllowClose: true,
    identityCountdownTextSingular: "This advertisement will end in % second",
    identityCountdownTextPlural: "This advertisement will end in % seconds"
  }, 
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);
    $this.showHandlers = {};
    $this.hideHandlers = {};
    $this.activeActions = {};
    $this.normalizedActionsPosition = -1; // (-1 for "before", relative time from 0 to 1 during playback, 2 for "after")
    // Build default properties and merge in player settings
    Player.bind('player:settings', function(){
      PlayerUtilities.mergeSettings($this, ['identityCountdown', 'identityAllowClose', 'identityCountdownTextSingular', 'identityCountdownTextPlural']);
    });

    

    // HANDLERS FOR ACTION TYPES
    // HANDLER: TEXT
    $this.showHandlers['text'] = function(action){
      // TODO: Make sure text scales well in text and html boxes
      action.container.html(action.text);
    }
    // HANDLER: HTML
    $this.showHandlers['html'] = function(action){
      action.container.html(action.html);
    }
    // HANDLER: IMAGE
    $this.showHandlers['image'] = function(action){
      // TODO: Write `image` show handle making sure image is displayed correctly in the correct aspect ratio
      var img = $(document.createElement('img')).attr('src', action.image_url);
      action.container.append(img);
    }
    // HANDLER: PRODUCT
    $this.showHandlers['product'] = function(action){
      // TODO: Write `product` show handler
    }
    // HANDLER: VIDEO
    $this.showHandlers['video'] = function(action){
      // TODO: Write `video` show handler
      // TODO: Honour `identityCountdown` and friend in video and ad handlers
    }
    $this.hideHandlers['video'] = function(action){
      // TODO: Write `video` hide handler
    }
    // HANDLER: AD
    $this.showHandlers['ad'] = function(action){
      // TODO: Write `ad` show handler
    }
    $this.hideHandlers['ad'] = function(action){
      // TODO: Write `ad` hide handler
    }
    
    
    // CONTROLLER LISTENING TO PLAYBACK STATE AND DISPATCHING ACTIONS
    var _dispatcher = function(event){
      // Normalize actionsPosition
      switch(event){
      case'player:video:beforeplay':
        $this.normalizedActionsPosition = -1; // "before"
        break;
      case 'player:video:ended':
        $this.normalizedActionsPosition = 2; // "after"
        break;
      default:
        try {
          $this.normalizedActionsPosition = Player.get('currentTime') / Player.get('duration');
        }catch(e){
          $this.normalizedActionsPosition = 0;
        }
      }

      // Dispatch actions
      $.each(Player.get('videoActions'), function(i,action){
        // Figure out of the action should be active or not
        var actionActive = $this.normalizedActionsPosition>=action.normalizedStartTime && $this.normalizedActionsPosition<=action.normalizedEndTime;
      
        // TODO: Fire show & hide handlers listed in the beginning of this file
        if(actionActive && !$this.activeActions[action.action_id]) {
          // Activate action by adding a container and calling the show handler
          console.debug('Show action', action);
          
          // Create a few dom containers for the actin
          var parent = $(document.createElement('div')).addClass('action').addClass('action-'+action.type);
          var container = $(document.createElement('div')).addClass('action-content');
          parent.append(container);
          $this.container.append(parent);
          action.container = container;
          action.parent = parent;

          // Click container for the element
          if(typeof(action.link)!='undefined') {
            var screen = $(document.createElement('a')).addClass('action-screen').attr({href:action.link, target:action.link_target||'_new'});
            parent.append(screen);
          }
          // Set position
          if(typeof(action.x)!='undefined' && typeof(action.y)!='undefined') {
            parent.css({top:(parseFloat(action.x)*100)+'%', left:(parseFloat(action.y)*100)+'%'});
          }
          // Set size
          if(typeof(action.width)!='undefined' && typeof(action.height)!='undefined') {
            parent.css({width:(parseFloat(action.width)*100)+'%', height:(parseFloat(action.height)*100)+'%'});
          }
          
          $this.activeActions[action.action_id] = action;
          if($this.showHandlers[action.type]) $this.showHandlers[action.type](action);
        } else if(!actionActive && $this.activeActions[action.action_id]) {
          // Deactivate action by calling hide handler and then unloading the container
          console.debug('Hide action', action);
          if($this.hideHandlers[action.type]) $this.hideHandlers[action.type](action);
          action.parent.remove();
          delete action.container;
          delete action.parent;
          delete $this.activeActions[action.action_id];
        }
      });
      
      return true;
    }


    // VERIFY AND RETRIEVE ACTIONS DATA
    // When a video is loaded, reset the state of the Actions
    // Also this, is where we may need to populate the `actions` property of the video object
    Player.bind('player:video:loaded', function(e,v){
      if(!v.actions) {
        Player.get('api').action.get(
          {photo_id:v.photo_id, token:v.token},
          function(data){
            v.actions = data.actions;
            $.each(v.actions, function(i,action){
              action.normalizedStartTime = (action.start_time == "before" ? -1 : (action.start_time == "after" ? 2 : parseFloat(action.start_time)));
              action.normalizedEndTime = (action.end_time == "before" ? -1 : (action.end_time == "after" ? 2 : parseFloat(action.end_time)));
            });
            _dispatcher();
          },
          Player.fail
        );
      } else {
        $.each(v.actions, function(i,action){
          action.normalizedStartTime = (action.start_time == "before" ? -1 : (action.start_time == "after" ? 2 : parseFloat(action.start_time)));
          action.normalizedEndTime = (action.end_time == "before" ? -1 : (action.end_time == "after" ? 2 : parseFloat(action.end_time)));
        });
      }
      _dispatcher();
    });

    // EVENTS TO DISPATCHER
    Player.bind('player:video:beforeplay player:video:play player:video:playing player:video:timeupdate player:video:ended', _dispatcher);

    
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
    Player.setter('closeIdentity', function(){
      // Close clip
      // TODO: Create logic for `closeIdentity`
    });
      
    return $this;
  }
);



/* UTILITY FUNCTION FOR CONTROLLING PLAYBACK STATE */
var VastHandler = function(url){
  var $vast = this;
  $vast.url = url;
  $vast.on = function(){
  }
  return $vast;
}

var stealEingebaut = function(){
}