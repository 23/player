/* 
  MODULE: SRUBBER
  Show time line for the video currently being played.

  Listens for:
  - player:video:progress
  - player:video:timeupdate
  - player:video:seeked
  - player:video:ended
*/

Player.provide('scrubber', 
  {},
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);

      // Build the template
      $this.thumbnailImage = '';
      $this.render(function(){
          // Find the relavant elements in the template
          $this.scrubberContainer = $($this.container).find('.scrubber-container');
          $this.bufferContainer = $($this.container).find('.scrubber-buffer');
          $this.playContainer = $($this.container).find('.scrubber-play');
          $this.timeContainer = $($this.container).find('.scrubber-time');
          $this.thumbnailContainer = $($this.container).find('.scrubber-thumbnail');
          $this.thumbnailImageContainer = $($this.container).find('.scrubber-thumbnail img');

          // Handle clicks on the time line
          $this.scrubberContainer.click(function(e){
              var duration = Player.get('duration');
              if(isNaN(duration)||duration<=0) {
                Player.set('playing', true);
              } else {
                Player.set('currentTime', e.offsetX / $this.scrubberContainer.width() * duration);
                Player.set('playing', true);
              }
            });

          // Show thumbs
          $this.scrubberContainer.mousemove(function(e){
              var o = e.offsetX-100;
              o = Math.max(10, Math.min($this.scrubberContainer.width()-210, o));
              $this.thumbnailContainer.css({left:o+'px'});

              var duration = Player.get('duration');
              if(!isNaN(duration)&&duration>0) {
                var t = Player.get('video_base_url') + '200x:' + Math.round(5*((e.offsetX / $this.scrubberContainer.width() * duration)/5)) + '/thumbnail.jpg';
                if (t!=$this.thumbnailImage) {
                  $this.thumbnailImage = t;
                  $this.thumbnailImageContainer.hide();
                  $this.thumbnailImageContainer.load(function(){
                      $this.thumbnailImageContainer.show();
                    });
                  $this.thumbnailImageContainer.attr('src', $this.thumbnailImage);
                }
              }
            });
        });

      Player.bind('player:video:progress player:video:timeupdate player:video:seeked player:video:ended', function(e,o){
          var duration = Player.get('duration');
          if(isNaN(duration)||duration<=0) return;

          // Update time labels
          $this.render(function(){}, 'scrubber/scrubber-time.liquid', $this.timeContainer);

          // Update buffer and play progress
          try {
            $this.bufferContainer.css({width:(100.0*Player.get('bufferTime')/duration)+'%'});
          }catch(e){}
          try {
            $this.playContainer.css({width:(100.0*Player.get('currentTime')/duration)+'%'});
          }catch(e){}
        });

      return $this;
  }
);
