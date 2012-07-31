/* 
 MODULE: VOLUME/MUTE BUTTON
 Show a mute/sound button
 
 Listens for:
 - player:video:volumechange
*/

Player.provide('volume-button', 
  {}, 
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);
    $this.render();
    
    $this.container.click(function(e){
        e.stopPropagation();
        Player.set('volume', (Player.get('volume')>0 ? 0 : 1));
        return false;
      });

    Player.bind('player:video:volumechange', function(e){
        $this.render();
      });
      
    return $this;
  }
          
);
