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
    infoTimeout: 10000
  },
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);
      $this.showAnimation = [{opacity:'show'}, 400];
      
      // Listen to find if we show show info
      Player.bind('player:settings', function(e,settings){
          PlayerUtilities.mergeSettings($this, ['showDescriptions', 'infoTimeout']);
        });

      // Bind to events
      Player.bind('player:infoengaged', function(e,video){
          $this.render();
      });
      Player.bind('player:video:play', function(e,video){
          Player.set('showDescriptions', false);
      });
      Player.bind('player:settings player:video:loaded', function(e,video){
          if($this.infoTimeout>0) {
            setTimeout(function(){
              if($this.infoTimeout>0) {
                Player.set('showDescriptions', false);
              }
            }, $this.infoTimeout);
          }
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
      Player.setter('showDescriptions', function(sd){
          if(sd) {
              $('.activebutton').removeClass('activebutton').parent().removeClass("activebutton-container");
              Player.set('browseMode', false);
              Player.set('showSharing', false);
              Player.set('slideOverviewShown', false);
          }
          $this.showDescriptions = sd;
          $this.infoTimeout = 0; // disable fade-out when showDescription is explicitly set
          Player.fire('player:infoengaged');
        });

      return $this;
  }
);
