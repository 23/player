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
  {}, 
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);
    $this.render();

    // Get relevant settings
    Player.bind('player:settings', function(e,settings){
        if(typeof(settings.showBigPlay)!='undefined') $this.showBigPlay = settings.showBigPlay;
      });

    // Handle clicks on element
    $this.container.click(function(e){
        e.stopPropagation();
        Player.set('playing', !Player.get('playing'));
        return false;
      });

    // Update element on play, pause and more
    Player.bind('player:video:playing player:video:seeked player:video:pause player:video:ended', function(e){
        $this.render();
      });

    /* GETTERS */
    Player.getter('showBigPlay', function(){
        return (typeof($this.showBigPlay)=='undefined'||($this.showBigPlay&&$this.showBigPlay!='0'));
      });
    /* SETTERS */
    Player.setter('showBigPlay', function(sbp){
        $this.showBigPlay = sbp;
        $this.render();
      });
      
    return $this;
  }
          
);
