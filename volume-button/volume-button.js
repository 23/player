/* 
 MODULE: VOLUME/MUTE BUTTON
 Show a mute/sound button
 
 Listens for:
 - player:video:volumechange
*/

Glue.provide('volume-button', 
  {}, 
  function(Glue,$,opts){
    var $this = this;
    $.extend($this, opts);
    $this.render();
    
    $this.container.click(function(e){
        e.stopPropagation();
        Glue.set('volume', (Glue.get('volume')>0 ? 0 : 1));
        return false;
      });

    Glue.bind('player:video:volumechange', function(e){
        $this.render();
      });
      
    return $this;
  }
          
);
