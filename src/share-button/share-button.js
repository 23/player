/* 
 MODULE: SHARE BUTTON
 Show share button, engaging the sharing pane
 
 Listens for:
 - player:sharing
*/

Player.provide('share-button', 
  {}, 
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);
    $this.render();
    
    Player.bind('player:sharing', function(e){
        $this.render();
      });

    return $this;
  }
          
);
