/* 
   MODULE: INFO
   Show title and description for the video
   
   Listens for:
   - player:settings: The app was loaded, time to show the info pane
   - player:video:loaded: New title and description to show

   Listens for:
   - player:infoengaged: Info pane was toggles somehow
   
   Answers properties:
   - showDescriptions [get/set]
   - infoTimeout [get]
*/

Player.provide('info', 
  {
    showDescriptions: true,
    infoTimeout: 5000
  },
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);
      $this.showAnimation = [{opacity:'show'}, 600];
      $this.hideAnimation = [{opacity:'hide'}, 400];
      
      // Listen to find if we show show info
      Player.bind('player:settings', function(e,settings){
          PlayerUtilities.mergeSettings($this, ['showDescriptions', 'infoTimeout']);
          Player.set('showDescriptions', $this.showDescriptions);
        });

      // Bind to events
      Player.bind('player:infoengaged', function(e,video){
          $this.render();
      });
      Player.bind('player:video:play player:video:playing', function(e,video){
          Player.set('showDescriptions', false);
      });
      Player.bind('player:settings player:video:loaded', function(e,video){
          Player.fire('player:infoengaged');
        });

      /* GETTERS */
      Player.getter('showDescriptions', function(){
          return $this.showDescriptions;
        });
      Player.getter('infoTimeout', function(){
          return $this.infoTimeout;
        });
     
      /* SETTERS */
      $this.infoTimeoutId = null;
      Player.setter('showDescriptions', function(sd){
          $this.showDescriptions = sd;

          if(sd && $this.infoTimeout>0){
            if($this.infoTimeoutId) window.clearTimeout($this.infoTimeoutId);
            $this.infoTimeoutId = window.setTimeout(function(){
              Player.set('showDescriptions', false);
            }, $this.infoTimeout);
          }

          Player.fire('player:infoengaged');
        });

      return $this;
  }
);
