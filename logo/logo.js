/* 
  MODULE: LOGO
  Show a logo in the player

  Listens for:
  - player:loaded: The app was loaded, time to show the logo
*/

Glue.provide('logo', 
  {},
  function(Glue,$,opts){
      var $this = this;
      $.extend($this, opts);
      
      // Bind to events
      Glue.bind('player:loaded', function(){
          console.log('We should show a logo');
        });
     
      return $this;
  }
);
