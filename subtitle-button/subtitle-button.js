/* 
   MODULE: SUBTITLE BUTTON
   Handle subtitle button
   
  Listens for:
   - player:subtitlechange
*/

Player.provide('subtitle-button', 
  {}, 
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);
    $this.render();

    // Toogle fullscreen on click
    $this.container.click(function(e){
        e.stopPropagation();
        Player.set('fullscreen', !Player.get('fullscreen'));
        Player.set('playing', true);
        return false;
      });

    // Update UI when subtitle changes
    Player.bind('player:subtitlechange', function(e){
        $this.render();
      });
      
    return $this;
  }
);
