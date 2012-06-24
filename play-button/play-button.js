/* 
 MODULE: PLAY BUTTON
 Show a play/pause/buffering button
 
 Listens for:
 - video:play
 - video:playing 
 - video:pause 
 - video:ended
*/

Glue.provide('play-button', {}, 

  function(Glue,$,opts){
      var $this = this;
      $.extend($this, opts);

      $this.container.click(function(){
          Glue.set('playing', !Glue.get('playing'));
      });
          
      $this.accessKey = 'p';
      $this.tabIndex = true;
      $this.className = 'player-play-paused';
      var _update = function(e){
          if(Glue.get('seeking')) {
              $this.className = 'player-play-seeking';
          } else if(Glue.get('playing')) {
              $this.className = 'player-play-playing';
          } else {
              $this.className = 'player-play-paused';
          }
          
          // re-render button
      }
      Glue.bind('video:play video:playing video:pause video:ended', _update);
      
      return $this;
  }
          
);
