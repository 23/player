/* 
 MODULE: BROWSE BUTTON
 Show a button for browsing recommendations
 
 Listens for:
 - player:browse:updated
 - player:browse:loaded
*/

Player.provide('browse-button', 
  {}, 
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);
    $this.render();
    
    Player.bind('player:browse:updated player:browse:loaded', function(e){
        $this.render();
      });

    return $this;
  }
          
);
