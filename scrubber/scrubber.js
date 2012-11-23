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
      $this.render(function(){
          // Find the relavant elements in the template
          $this.scrubberContainer = $($this.container).find('.scrubber-container');
          $this.bufferContainer = $($this.container).find('.scrubber-buffer');
          $this.playContainer = $($this.container).find('.scrubber-play');
          $this.timeContainer = $($this.container).find('.scrubber-time');
          $this.thumbnailContainer = $($this.container).find('.scrubber-thumbnail');

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
              if (!Player.get('video_has_frames')) {
                  $this.thumbnailContainer.hide();
                  return;
              }

              // The left offset is decided by the width of the frame, while having the padding on the left/right edge of the player in mind
              var offset = e.offsetX-(Player.get('video_frames_width')/2.0);
              offset = Math.max(10, Math.min($this.scrubberContainer.width()-(Player.get('video_frames_width')+10), offset));
              // The frame is calculated by the position on the scrubber container and the number of total frames.
              var frameNumber = Math.round( (e.offsetX/$this.scrubberContainer.width()) * Player.get('video_num_frames') );
              var frameOffset = frameNumber * Player.get('video_frames_height');
              // Position and show the thumbnail container
              $this.thumbnailContainer.css({
                  left:offset+'px',
                  width:Player.get('video_frames_width')+'px', 
                  height:Player.get('video_frames_height')+'px',
                  backgroundImage:'url(' + Player.get('video_frames_src') + ')',
                  backgroundPosition: '0 -'+frameOffset+'px'
              }).show();
          });
          $this.scrubberContainer.mouseleave(function(e){
              $this.thumbnailContainer.hide();
          });
        });

      Player.bind('player:video:loaded', function(){
          if (!Player.get('video_has_frames')) {
              $this.thumbnailContainer.css({backgroundImage:'url(' + Player.get('video_frames_src') + ')',});
          }
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
