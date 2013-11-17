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
              action.normalizedStartTime = (action.start_time == "before" ? -1 : (action.start_time == "after" ? 2 : action.start_time));
              action.normalizedEndTime = (action.end_time == "before" ? -1 : (action.end_time == "after" ? 2 : action.end_time));
            });
          },
          Player.fail
        );
      }
    });


    
    // HANDLERS FOR ACTION TYPES
    // HANDLER: TEXT
    $this.showHandlers['text'] = function(action){
      // TODO: Write `text` show handler
    }
    $this.hideHandlers['text'] = function(action){
      // TODO: Write `text` hide handler
    }
    // HANDLER: HTML
    $this.showHandlers['html'] = function(action){
      // TODO: Write `html` show handler
    }
    $this.hideHandlers['html'] = function(action){
      // TODO: Write `html` hide handler
    }
    // HANDLER: IMAGE
    $this.showHandlers['image'] = function(action){
      // TODO: Write `image` show handler
    }
    $this.hideHandlers['image'] = function(action){
      // TODO: Write `image` hide handler
    }
    // HANDLER: PRODUCT
    $this.showHandlers['product'] = function(action){
      // TODO: Write `product` show handler
    }
    $this.hideHandlers['product'] = function(action){
      // TODO: Write `product` hide handler
    }
    // HANDLER: VIDEO
    $this.showHandlers['video'] = function(action){
      // TODO: Write `video` show handler
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
    // Prerolls before the clip begins
    Player.bind('player:video:beforeplay player:video:play player:video:playing player:video:pause player:video:timeupdate player:video:ended', function(event){
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
          $this.actionsPosition = Player.get('currentTime') / Player.get('duration');
        }catch(e){
          $this.actionsPosition = 0;
        }
      }

      // Dispatch actions
      $.each(Player.get('videoActions'), function(i,action){
        // Figure out of the action should be active or not
        var actionActive = $this.normalizedActionsPosition>=action.normalizedStartTime && $this.normalizedActionsPosition<=action.normalizedEndTime;
        
        if(actionActive && !$this.activeActions[action.action_id]) {
          // Activate action by adding a container and calling the show handler
          action.container = $(document.createElement('div')).addClass('action').addClass('action-'+action.type);
          $this.container.add(action.container);
          $this.activeActions[action.action_id] = action;
          $this.showHandlers[action.type](action);
        } else if(!actionActive && $this.activeActions[action.action_id]) {
          // Deactivate action by calling hide handler and then unloading the container
          $this.hideHandlers[action.type](action);
          $this.container.remove(action.container);
          delete action.container;
          delete $this.activeActions[action.action_id];
        }
      });
    });


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
