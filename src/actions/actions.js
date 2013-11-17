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
  - videoActions [get]
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
    $this.actionsHandlers = {};
    
    
    // MODULE PROPERTIES
    // Build default properties and merge in player settings
    $this.actionsPosition = 'before'; // (before, relative time from 0 to 1, after)
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
          function(data){v.actions = data.actions;},
          Player.fail
        );
      }
    });

    
    
    // CONTROLLER LISTENING TO PLAYBACK STATE AND DISPATCHING ACTIONS
    // Prerolls before the clip begins
    Player.bind('player:video:beforeplay player:video:play player:video:playing player:video:pause player:video:timeupdate player:video:ended', function(event){
      // Normalize actionsPosition
      switch(event){
      case'player:video:beforeplay':
        $this.actionsPosition = 'before';
        break;
      case 'player:video:ended':
        $this.actionsPosition = 'after';
        break;
      default:
        try {
          $this.actionsPosition = Player.get('currentTime') / Player.get('duration');
        }catch(e){
          $this.actionsPosition = 0;
        }
      }

      // TODO: Start dispatching actions here
    });


    // GETTERS EXPOSING GENERIC PROPERTIES OF THE MODULE
    Player.getter('videoActions', function(){return Player.get('video').actions||{};});
    Player.getter('actionsPosition', function(){return $this.actionsPosition;});
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
