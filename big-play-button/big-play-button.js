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

Glue.provide('big-play-button', 
  {}, 
  function(Glue,$,opts){
    var $this = this;
    $.extend($this, opts);
    $this.render();

    // Get relevant settings
    Glue.bind('player:settings', function(e,settings){
        if(typeof(settings.showBigPlay)!='undefined') $this.showBigPlay = settings.showBigPlay;
      });

    // Handle clicks on element
    $this.container.click(function(e){
        e.stopPropagation();
        Glue.set('playing', !Glue.get('playing'));
        return false;
      });

    // Update element on play, pause and more
    Glue.bind('player:video:playing player:video:seeked player:video:pause player:video:ended', function(e){
        $this.render();
      });

    /* GETTERS */
    Glue.getter('showBigPlay', function(){
        return (typeof($this.showBigPlay)=='undefined'||($this.showBigPlay&&$this.showBigPlay!='0'));
      });
    /* SETTERS */
    Glue.setter('showBigPlay', function(sbp){
        $this.showBigPlay = sbp;
        $this.render();
      });
      
    return $this;
  }
          
);
