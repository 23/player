/* 
  MODULE: SRUBBER
  Show time line for the video currently being played.

  Listens for:
  - player:video:progress
  - player:video:timeupdate
  - player:video:seeked
  - player:video:ended
  - player:video:loaded

  Answers properties:
  - scrubberTime [get]
*/

Player.provide('scrubber', 
  {},
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);

      // BUILD AND RENDER
      // Build the template
      $this.scrubberTime = null;
      $this.render(function(){
          // Find the relavant elements in the template
          $this.scrubber = $($this.container).find('.scrubber');
          $this.bufferContainer = $($this.container).find('.scrubber-buffer');
          $this.playContainer = $($this.container).find('.scrubber-play');
          $this.handleContainer = $($this.container).find('.scrubber-handle');
          $this.timeContainer = $($this.container).find('.scrubber-time');
          $this.thumbnailContainer = $($this.container).find('.scrubber-thumbnail');
          
          // Handle clicks on the time line
          $this.scrubber.click(function(e){
              var duration = Player.get('duration');
              if(isNaN(duration)||duration<=0) {
                  Player.set('playing', true);
              } else {
                  var offsetX = e.pageX - $(e.target).offsetParent().offset().left;
                  Player.set('currentTime', offsetX / $this.scrubber.width() * duration);
                  Player.set('playing', true);
              }
          });

          // Show thumbs
          $this.scrubber.mousemove(function(e){
              if (!Player.get('video_has_frames')) {
                  $this.thumbnailContainer.hide();
                  return;
              }
              
              var offsetX = e.pageX - $(e.target).offsetParent().offset().left;
              var playhead = offsetX/$this.scrubber.width() * Player.get('duration');
              $this.showFrame(playhead);
          });
          $this.scrubber.mouseleave(function(e){
              if($this.scrubberTime==null) {
                  $this.thumbnailContainer.hide();
              }
          });

          // Support dragging of the scrubber handle
          if($this.handleContainer) {
              $this.handleContainer.mousedown(function(){
                  // Enable dragging and different positioning of the scruber
                  $this.scrubberTime = Player.get('currentTime'); 
              });
              $(window).mousemove(function(e){
                  if($this.scrubberTime!==null) {
                      // Update $this.scrubberTime based on the dragging
                      var scrubberLeft = $this.scrubber.offset()['left'];
                      var scrubberWidth = $this.scrubber.width();
                      var x = Math.max(0, Math.min(e.clientX-scrubberLeft, scrubberWidth)); 
                      $this.scrubberTime = x/scrubberWidth * Player.get('duration');
                      // Set the frame
                      $this.showFrame($this.scrubberTime);
                      // And update the scrubber to position the handle
                      $this.updateScrubber();
                  }
              });
              $(window).mouseup(function(){
                  if($this.scrubberTime!==null) {
                      // Jump to the selected time and clear the dragging
                      Player.set('currentTime', $this.scrubberTime);
                      Player.set('playing', true);
                      $this.scrubberTime = null;
                  }
              });
              $this.handleContainer.on('click, mousemove', function(e){
                  // Clicks on the handle shouldn't bubble to clicks on the scrubber
                  e.stopPropagation(); 
              });
          }

      });


      // METHODS
      // Methods to handle scrubber updates
      $this.updateScrubber = function(){
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
          try {
              $this.handleContainer.css({left: (($this.scrubberTime||Player.get('currentTime'))/duration * $this.scrubber.width()) - ($this.handleContainer.width()/2) +'px'});
          }catch(e){}
      }
      $this.showFrame = function(playhead) {
          // The frame is calculated by the playhead position and the number of total frames.
          var relativePlayhead = playhead/Player.get('duration');
          var frameNumber = Math.round(relativePlayhead*Player.get('video_num_frames'));
          var frameOffset = frameNumber * Player.get('video_frames_height');
          // Calculate position of the thumbnail display
          var thumbnailWidth = $this.thumbnailContainer.width();
          var scrubberWidth = $this.scrubber.width();
          var positionOffset = (relativePlayhead*scrubberWidth) - (thumbnailWidth/2);
          var positionOffset = Math.max(0, Math.min(positionOffset, scrubberWidth-thumbnailWidth));
          // Position and show the thumbnail container
          $this.thumbnailContainer.css({
              left:positionOffset+'px',
              width:Player.get('video_frames_width')+'px', 
              height:Player.get('video_frames_height')+'px',
              backgroundImage:'url(' + Player.get('video_frames_src') + ')',
              backgroundPosition: '0 -'+frameOffset+'px'
          }).show();
      }


      // EVENTS
      // Set the frames background on load
      Player.bind('player:video:loaded', function(){
          if (!Player.get('video_has_frames')) {
              $this.thumbnailContainer.css({backgroundImage:'url(' + Player.get('video_frames_src') + ')',});
          }
      });
      // Update scrubber on progress and on window resize
      Player.bind('player:video:progress player:video:timeupdate player:video:seeked player:video:ended', $this.updateScrubber);
      $(window).resize($this.updateScrubber);


      // PROPERTIES
      // scrubberTime
      Player.getter('scrubberTime', function(){
          return $this.scrubberTime;
      });


      return $this;
  }
);
