/* 
  MODULE: PLAY/PAUSE/BUFFERING BUTTON 
*/

P.provide('play', {}, 

  function(P,$,opts,container){
      var $this = this;
      $.extend($this, opts);
      $this.container = container;

      $this.container.click(function(){
          P.set('playing', !P.get('playing'));
      });
          
      $this.accessKey = 'p';
      $this.tabIndex = true;
      $this.className = 'player-play-paused';
      var _update = function(e){
          if(P.get('seeking')) {
              $this.className = 'player-play-seeking';
          } else if(P.get('playing')) {
              $this.className = 'player-play-playing';
          } else {
              $this.className = 'player-play-paused';
          }
          
          // re-render button
      }
      P.bind('video:play video:playing video:pause video:ended', _update);
      
      return $this;
  }
          
);
