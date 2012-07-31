/* 
   MODULE: INFO
   Show title and description for the video
   
   Listens for:
   - player:settings: The app was loaded, time to show the info pane
   - player:video:loaded: New title and description to show
   
   Answers properties:
   - showDescriptions [get/set]
*/

Player.provide('info', 
  {},
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);
      
      // Listen to find if we show show info
      Player.bind('player:settings', function(e,settings){
          if(typeof(settings.showDescriptions)!='undefined') $this.showDescriptions = settings.showDescriptions;
        });

      // Bind to events
      Player.bind('player:video:loaded player:video:play player:video:playing player:video:pause player:video:ended', function(e,video){
          $this.render();
        });

      /* GETTERS */
      Player.getter('showDescriptions', function(){
          return (typeof($this.showLogo)=='undefined'||($this.showLogo&&$this.showLogo!='0'));
        });
     
      /* SETTERS */
      Player.setter('showDescriptions', function(si){
          $this.showLogo = si;
          $this.render();
        });

      return $this;
  }
);
