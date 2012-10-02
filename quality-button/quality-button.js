/* 
   MODULE: QUALITY BUTTON
   Handle quality switching
   
  Listens for:
   - player:video:qualitychange
*/

Player.provide('quality-button', 
  {}, 
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);

    // Update UI when subtitle changes
    Player.bind('player:video:qualitychange', function(e){
        $this.render();
      });
      
    return $this;
  }
);
