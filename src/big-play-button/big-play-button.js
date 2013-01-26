/* 
   MODULE: BIG PLAY BUTTON
   Show a play/pause button
   
   Listens for:
   - player:video:play
   - player:video:playing 
   - player:video:pause 
   - player:video:ended
   
   Answers properties:
   - showBigPlay [get/set]
*/

Player.provide('big-play-button', 
  {
    showBigPlay: true
  }, 
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);
    $this.render();

    // Get relevant settings
    Player.bind('player:settings', function(e,settings){
        PlayerUtilities.mergeSettings($this, ['showBigPlay']);
      });

    // Update element on play, pause and more
    Player.bind('player:video:loaded player:video:play player:video:seeked player:video:pause player:video:ended', function(e){
        $this.render();
      });

    /* GETTERS */
    Player.getter('showBigPlay', function(){
        return $this.showBigPlay;
      });
    /* SETTERS */
    Player.setter('showBigPlay', function(sbp){
        $this.showBigPlay = sbp;
        $this.render();
      });
      
    return $this;
  }
          
);
