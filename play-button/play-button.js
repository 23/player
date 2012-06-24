/* 
 MODULE: PLAY BUTTON
 Show a play/pause button
 
 Listens for:
 - player:video:play
 - player:video:playing 
 - player:video:pause 
 - player:video:ended
*/

Glue.provide('play-button', 
  {}, 
  function(Glue,$,opts){
    var $this = this;
    $.extend($this, opts);
    $this.render();
    
    $this.container.click(function(e){
        e.stopPropagation();
        Glue.set('playing', !Glue.get('playing'));
        $this.render();
        return false;
      });

    Glue.bind('player:video:playing player:video:seeked player:video:pause player:video:ended', function(e){
        $this.render();
      });
      
    return $this;
  }
          
);
