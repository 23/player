/* 
   MODULE: PAUSED SCREEN
   Show sharing and related
   
   Listens for:
   - player:video:play
   - player:video:playing 
   - player:video:pause 
   - player:video:ended
*/

Player.provide('paused', 
  {}, 
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);
    $this.render();

    // Update element on play, pause and more
    Player.bind('player:video:play player:video:seeked player:video:pause player:video:ended', function(e){
        $this.render();
      });

      
    return $this;
  }
          
);
