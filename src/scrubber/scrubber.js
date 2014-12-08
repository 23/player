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
  {
    handleTextLive: 'Live'
  },
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);

      // BUILD AND RENDER
      // Build the template
      $this.scrubberTime = null;
      $this.onRender = function(){
          // Find the relavant elements in the template
          $this.scrubber = $($this.container).find('.scrubber');
          if($this.scrubber.length==0) return;
          $this.scrubberContainer = $($this.container).find('.scrubber-container');
          $this.bufferContainer = $($this.container).find('.scrubber-buffer');
          $this.playContainer = $($this.container).find('.scrubber-play');
          $this.trackContainer = $($this.container).find('.scrubber-track');
          $this.handleContainer = $($this.container).find('.scrubber-handle');
          $this.timeContainer = $($this.container).find('.scrubber-time');
          $this.thumbnailContainer = $($this.container).find('.scrubber-thumbnail');
          $this.thumbnailContainerSub = $($this.container).find('.scrubber-thumbnail-sub');

          // Giver a class to indicate that the mouse of over the scrubber
          $this.scrubberContainer.mouseenter(function(){
              $this.scrubberContainer.addClass('hover').addClass('scrubber-container-hover');
          });
          $this.scrubberContainer.mouseleave(function(){
              $this.scrubberContainer.removeClass('hover').removeClass('scrubber-container-hover');
          });

          // Update the scrubber contents
          $this.updateScrubber();

          // Handle clicks on the time line
          $this.scrubber.on("click", function(e, oe){
              var duration = Player.get('duration'),
                  offsetX = e.pageX - $(e.target).offsetParent().offset().left,
                  offsetRelative = offsetX / $this.scrubber.get(0).clientWidth,
                  videoElement = Player.get('videoElement'),
                  video = Player.get('video');

              Player.set('currentTime', offsetX / $this.scrubber.get(0).clientWidth * duration);
              Player.set('playing', true);
              e.stopPropagation();
          });
          $this.scrubber.on("touchmove", function(e){
              $this.dragging = true;
              var duration = Player.get("duration");
              var offsetX = e.originalEvent.pageX - $(e.target).offsetParent().offset().left;
              $this.displayPlayProgress = offsetX / $this.scrubber.width() * duration;
              $this.updateScrubber();
          });
          $this.scrubber.on("touchend", function(e){
              if ($this.dragging) {
                  $this.dragging = false;
                  Player.set("currentTime", $this.displayPlayProgress);
                  Player.set("playing", true);
              }
          });

          // Show thumbs
          $this.scrubber.mousemove(function(e){
              if (!Player.get('video_has_frames')) {
                  $this.thumbnailContainer.hide();
                  return;
              }
              var offsetX = e.pageX - $(e.target).offsetParent().offset().left;
              var playhead = offsetX/$this.scrubber.get(0).clientWidth * Player.get('duration');
              $this.showFrame(playhead);
          });
          $this.scrubber.mouseleave(function(e){
              if($this.scrubberTime==null) {
                  $this.thumbnailContainer.hide();
                  $this.frameBackgroundShown = false;
              }
          });

          // Support dragging of the scrubber handle
          if($this.handleContainer) {
              $this.handleContainer.mousedown(function(){
                  // Enable dragging and different positioning of the scruber
                  $this.scrubberTime = Player.get('currentTime');
              });
              $(document).mousemove(function(e){
                  if($this.scrubberTime!==null) {
                      // Update $this.scrubberTime based on the dragging
                      var scrubberLeft = $this.scrubber.offset()['left'];
                      var scrubberWidth = $this.scrubber.get(0).clientWidth;
                      var x = Math.max(0, Math.min(e.clientX-scrubberLeft, scrubberWidth));
                      $this.scrubberTime = x/scrubberWidth * Player.get('duration');
                      // Set the frame
                      $this.showFrame($this.scrubberTime);
                      // And update the scrubber to position the handle
                      $this.updateScrubber();
                  }
              });
              $(document).mouseup(function(){
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
      };
      $this.render($this.onRender);


      // METHODS
      // Methods to handle scrubber updates
      $this.updateScrubber = function(){
          var duration = Player.get('duration'),
              newTime = Player.get("scrubberTime") ? Player.get("scrubberTime") : Player.get("currentTime"),
              handleTime;

          if (!Player.get('isLive')) {
              if (isNaN(duration) || duration <= 0) return;
          }

          // Update handle labels
          if (Player.get('video').type === 'clip') {
              // Normal handle
              if ($this.timeContainer && $this.timeContainer.length) $this.timeContainer.html(formatTime(newTime));
          } else {
              if ((!Player.get('scrubberTime') && Player.get('quality') === 'standard') || (newTime > (duration - Player.get('liveBufferRegion')))) {
                if ($this.timeContainer && $this.timeContainer.length) $this.timeContainer.html($this.handleTextLive);
              } else {
                  if (Player.get('videoElement').getProgramDate()) {
                    handleTime = (Player.get('videoElement').getProgramDate() - (Player.get('currentTime') * 1000)) + (newTime * 1000);
                  } else {
                    var now = new Date();
                    handleTime = now - ((duration - newTime) * 1000);
                  }

                  if ($this.timeContainer && $this.timeContainer.length) $this.timeContainer.html($this.clockFromEpoch(handleTime));
              }
          }

          // Update buffer and play progress
          try {
              if (!Player.get('isLive')) {
                  $this.bufferContainer.css({
                      width: (100.0 * Player.get('bufferTime') / duration) + '%'
                  });
              } else {
                  $this.bufferContainer.css({
                      width: '100%'
                  });
              }
          } catch (e) {}
          try {
              if (!Player.get('isLive')) {
                  $this.playContainer.css({
                      width: (100.0 * Player.get('displayPlayProgress') / duration) + '%'
                  });
              } else {
                  $this.playContainer.css({
                      width: '100%'
                  });
              }
          } catch (e) {}
      }
      $this.initFrameBackground = false;
      $this.loadedFrameBackground = false;
      $this.frameBackgroundShown = false;
      $this.showFrame = function(playhead) {
          // The frame is calculated by the playhead position and the number of total frames.
          var relativePlayhead = playhead/Player.get('duration');
          var frameNumber = Math.round(relativePlayhead*Player.get('video_num_frames'));
          var frameOffset = Math.ceil(frameNumber * Player.get('video_frames_height'))+1;
          // Calculate position of the thumbnail display
          var thumbnailWidth = $this.thumbnailContainer.get(0).clientWidth;
          var scrubberWidth = $this.scrubber.get(0).clientWidth;
          var positionOffset = (relativePlayhead*scrubberWidth) - (thumbnailWidth/2);
          var positionOffset = Math.max(0, Math.min(positionOffset, scrubberWidth-thumbnailWidth));
          // Position and show the thumbnail container
          if(!$this.initFrameBackground) {
              $this.thumbnailContainer.css({
                  width:Player.get('video_frames_width')+'px',
                  height:(Player.get('video_frames_height')-2)+'px'
              });
              $("<img>").load(function(){
                  $this.loadedFrameBackground = true;
          $this.thumbnailContainerSub.css({
                      backgroundImage:'url(' + Player.get('video_frames_src') + ')'
          });
                  if($this.frameBackgroundShown) $this.thumbnailContainer.show();
          }).attr("src",Player.get("video_frames_src"));
              $this.initFrameBackground = true;
          }
          $this.thumbnailContainer.css({
              left:positionOffset+'px'
          });
          if($this.loadedFrameBackground) $this.thumbnailContainer.show();
          $this.frameBackgroundShown = true;
          $this.thumbnailContainerSub.css({
              backgroundPosition: '0 -'+frameOffset+'px'
          });
      }

      $this.clockFromEpoch = function(epochTime) {
          var theDate = new Date(epochTime + (parseInt(Player.get('video').timezone_offset))*60*60*1000);
              var hours = theDate.getUTCHours();
              var minutes = theDate.getUTCMinutes();

          if (hours < 10) {
              hours = '0' + hours;
          }

          if (minutes < 10) {
              minutes = '0' + minutes;
          }

          return hours + ':' + minutes;
      };


      // EVENTS
      // Set the frames background on load
      Player.bind('player:video:loaded', function(){
          $this.render($this.onRender);
          $this.initFrameBackground = false;
          $this.loadedFrameBackground = false;
          $this.frameBackgroundShown = false;
      });
      // Update scrubber on progress and on window resize
      Player.bind('player:video:progress player:video:timeupdate player:video:seeked player:video:ended', $this.updateScrubber);
      $(window).resize($this.updateScrubber);


      // PROPERTIES
      // scrubberTime
      Player.getter('scrubberTime', function(){
          return $this.scrubberTime||'';
      });
      Player.getter('displayPlayProgress', function(){
          if ($this.dragging) {
              return $this.displayPlayProgress;
          } else {
              return Player.get('currentTime');
          }
      });

      return $this;
  }
);