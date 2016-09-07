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
      showDomain: true
  },
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);

      $this.onRender = function(){
          Player.set('infoShown', !!$this.showDescriptions);
      };

      // Bind to events
      Player.bind('player:settings', function(e){
          PlayerUtilities.mergeSettings($this, ['showDescriptions', 'showDomain']);
          $this.render($this.onRender);
      });
      Player.bind('player:video:loaded', function(e,video){
          $this.render($this.onRender);
      });
      Player.bind('player:video:play', function(e,video){
          Player.set('infoShown', false);
      });

      /* GETTERS */
      Player.getter('infoShown', function(){
          return $this.infoShown;
      });
      Player.getter('showDomain', function(){ return $this.showDomain; });
     
      /* SETTERS */
      Player.setter('infoShown', function(is){
          $this.infoShown = is;
          Player.set("forcer", {type: "block", element: "tray", from: "info", active: $this.infoShown});
          $this.container.find(".info-overlay").toggle($this.infoShown);
      });

      $this.render();

      return $this;
  }
);
