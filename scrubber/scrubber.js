/* 
  MODULE: SRUBBER
  Show time line for the video currently being played.

  Listens for:
  - player:video:progress
  - player:video:timeupdate
  - player:video:seeked
  - player:video:ended
*/

Glue.provide('scrubber', 
  {
    className:'tray-scrubber'
  },
  function(Glue,$,opts){
      var $this = this;
      $.extend($this, opts);

      // Build the template
      $this.render(function(){
          // Find the relavant elements in the template
          $this.scrubberContainer = $($this.container).find('.scrubber-container');
          $this.bufferContainer = $($this.container).find('.scrubber-buffer');
          $this.playContainer = $($this.container).find('.scrubber-play');
          $this.timeContainer = $($this.container).find('.scrubber-time');

          // Handle clicks on the time line
          $this.scrubberContainer.click(function(e){
              var duration = Glue.get('duration');
              if(isNaN(duration)||duration<=0) {
                Glue.set('playing', true);
              } else {
                Glue.set('currentTime', e.offsetX / $this.scrubberContainer.width() * duration);
                Glue.set('playing', true);
              }
            });
        });

      Glue.bind('player:video:progress player:video:timeupdate player:video:seeked player:video:ended', function(e,o){
          var duration = Glue.get('duration');
          if(isNaN(duration)||duration<=0) return;

          // Update time labels
          $this.render(function(){}, 'scrubber/scrubber-time.liquid', $this.timeContainer);

          // Update buffer and play progress
          try {
            $this.bufferContainer.css({width:(100.0*Glue.get('bufferTime')/duration)+'%'});
          }catch(e){}
          try {
            $this.playContainer.css({width:(100.0*Glue.get('currentTime')/duration)+'%'});
          }catch(e){}
        });

      return $this;
  }
);
