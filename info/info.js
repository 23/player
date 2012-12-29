/* 
   MODULE: INFO
   Show title and description for the video
   
   Listens for:
   - player:settings: The app was loaded, time to show the info pane
   - player:video:loaded: New title and description to show
   
   Answers properties:
   - showDescriptions [get/set]
   - infoTimeout [get/set]
*/

Player.provide('info', 
  {
    showDescriptions: true,
    infoTimeout: 0
  },
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);
      
      // Listen to find if we show show info
      Player.bind('player:settings', function(e,settings){
          PlayerUtilities.mergeSettings($this, ['showDescriptions', 'infoTimeout']);
        });

      // Bind to events
      Player.bind('player:settings player:video:loaded player:video:play player:video:playing player:video:pause player:video:ended', function(e,video){
          $this.render();
          
          if($this.infoTimeout>0) {
            setTimeout(function(){$this.container.hide(500)}, $this.infoTimeout);
          }
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
          $this.showDescriptions = sd;
          if(sd) Player.set('infoTimeout', 0); // disable fade-out when showDescription is explicitly set
          $this.render();
        });
      Player.setter('infoTimeout', function(it){
          $this.infoTimeout = it;
          $this.render();
        });

      return $this;
  }
);
