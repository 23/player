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
      $this.scrubber = $this.container.find('.scrubber');
      $this.scrubberContainer = $this.container.find('.scrubber-container');
      $this.bufferContainer = $this.container.find('.scrubber-buffer').css({"opacity": 0.2});
      $this.playContainer = $this.container.find('.scrubber-play');
      $this.timeContainer = $this.container.find('.time-container');
      $this.thumbnailContainer = $this.container.find('.scrubber-thumbnail');
      $this.thumbnailTime = $this.thumbnailContainer.find(".scrubber-thumbnail-time");

      // Update the scrubber contents
      $this.updateScrubber();
      // Load the video frame image
      $this.scrubberContainer.on("mouseenter", $this.initScrubberThumbnail);

      if($this.scrubber.size() > 0){
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
      }
    };
    $this.render($this.onRender);


    // METHODS
    // Methods to handle scrubber updates
    $this.updateScrubber = function(){
      var duration = Player.get('duration');

      // Sanity check for duration
      if (!Player.get('isLive')) {
        if (isNaN(duration) || duration <= 0) return;
      }

      // Handle three different kinds of scrubbers: video, dvr, live
      var scrubberType = 'video';
      if(Player.get('quality')=='dvr') {
        scrubberType = 'dvr';
      } else if(Player.get('isLive')) {
        scrubberType = 'live';
      }


      try {
        switch(scrubberType) {
          case 'video':
            $this.bufferContainer.css({
              width: (100.0 * Player.get('bufferTime') / duration) + '%'
            });
            $this.playContainer.css({
              width: (100.0 * Player.get('displayPlayProgress') / duration) + '%'
            });
            $this.timeContainer.text( formatTime(Player.get('displayPlayProgress')) );
            $(".scrubber, .sections").css({
              marginRight: $this.timeContainer.width() + 10
            });
            $('.scrubber-track').attr('aria-valuetext', formatTimeToReadable(Player.get('displayPlayProgress')))
            break;
          case 'dvr':
            $this.bufferContainer.css({
              width: (100.0 * Player.get('bufferTime') / duration) + '%'
            });
            $this.playContainer.css({
              width: (100.0 * Player.get('displayPlayProgress') / duration) + '%'
            });
            $(".scrubber, .sections").css({
              marginRight: $this.timeContainer.width() + 16
            });
            $this.timeContainer.html( "<span>Live</span>" + Player.get('displayDvrTime') );
            break;
          case 'live':
            $this.bufferContainer.css({
              width: '100%'
            });
            $this.playContainer.css({
              width: '100%'
            });
            if($this.timeContainer && $this.timeContainer.size() > 0) {
              $this.timeContainer.html( "<span>Live</span>" + formatTime(Player.get('displayPlayProgress')) );
            }
            break;
        }
      }catch(e){}
    }

    $this.showFrame = function(playhead, offsetPct) {
      // The frame is calculated by the playhead position and the number of total frames.
      var frameNumber = Math.round(offsetPct*(Player.get('video_num_frames')-1));
      var frameOffset = Math.ceil(frameNumber * _thumbnailHeight)+1;
      // Calculate position of the thumbnail display
      var scrubberWidth = $this.scrubber.get(0).clientWidth;
      var positionOffset = (offsetPct*scrubberWidth) - (_thumbnailWidth + 4)/2;
      // Position and show the thumbnail container
      $this.thumbnailContainer.css({
        left:positionOffset+'px'
      });
      $this.thumbnailContainer.find("img").css({
        top: 0-frameOffset
      });
      $this.thumbnailTime.text(formatTime(playhead));
    }

    var _initedScrubberThumbnail= false;
    $this.initScrubberThumbnail = function(){
      if(_initedScrubberThumbnail) return;
      _initedScrubberThumbnail = true;

      if(!Player.get("video_has_frames")){
        return $this.thumbnailContainer.hide();
      }

      // Set thumbnail dimensions
      _thumbnailWidth = 94;
      _thumbnailHeight = Player.get("video_frames_height") * _thumbnailWidth / Player.get("video_frames_width");
      $this.thumbnailContainer.css({
        width:_thumbnailWidth,
        height:_thumbnailHeight-2
      });
      // Load the image
      var thumbnail = $("<img />");
      thumbnail.load(function(){
        $this.thumbnailContainer.css({"display": ""});
      }).attr({
        crossorigin:"anonymous",
        src: Player.get("video_frames_src")
      });
      $this.thumbnailContainer.prepend(thumbnail);

      // Update and position on mousemove
      $this.scrubber.mousemove(function(e){
        var offsetX = e.pageX - $(e.target).offsetParent().offset().left;
        var offsetPct = offsetX/$this.scrubber.get(0).clientWidth;
        var playhead =  offsetPct * Player.get('duration');
        $this.showFrame(playhead, offsetPct);
      });
    };

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
    Player.bind('player:video:loaded player:settings', function(){
      $this.render($this.onRender);
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
    Player.getter('displayDvrTime', function(){
      return (new Date(Player.get('videoElement').getProgramDate())).toLocaleTimeString()
    });


    return $this;
  }
);

Player.translate("seek_slider",{
  en: "Seek slider"
});
