/* 
   MODULE: INFO
   Show title and description for the video
   
   Listens for:
   - player:settings: The app was loaded, time to show the info pane
   - player:video:loaded: New title and description to show
   
   Answers properties:
   - showDescriptions [get/set]
*/

Glue.provide('info', 
  {},
  function(Glue,$,opts){
      var $this = this;
      $.extend($this, opts);
      
      // Listen to find if we show show info
      Glue.bind('player:settings', function(e,settings){
          if(typeof(settings.showDescriptions)!='undefined') $this.showDescriptions = settings.showDescriptions;
        });

      // Bind to events
      Glue.bind('player:video:loaded', function(e,video){
          $this.render();
        });

      /* GETTERS */
      Glue.getter('showDescriptions', function(){
          return (typeof($this.showLogo)=='undefined'||($this.showLogo&&$this.showLogo!='0'));
        });
     
      /* SETTERS */
      Glue.setter('showDescriptions', function(si){
          $this.showLogo = si;
          $this.render();
        });

      return $this;
  }
);
