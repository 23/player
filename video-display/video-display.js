/* 
  MODULE: VIDEO
  Handle all video playback for the current video 
  (including quality, buffering, scrubbing, volume, progress and skipping) 

  Fires events:
  - player:video:loadeddata
  - player:video:ready
  - player:video:progress
  - player:video:timeupdate
  - player:video:seeked
  - player:video:seeking
  - player:video:stalled
  - player:video:canplay
  - player:video:play
  - player:video:playing
  - player:video:pause
  - player:video:loadedmetadata
  - player:video:ended
  - player:video:volumechange   
  - player:video:displaydevice
  - player:video:playerloaded
  - player:video:playerready
  - player:video:sourcechange
  - player:video:qualitychange
  
  Answers properties:
  - playing [get/set]
  - currentTime [get/set]
  - seekedTime [get]
  - volume [get/set]
  - quality [get/set]
  - qualities [get]
  - ended [get]
  - seeking [get]
  - stalled [get]
  - paused [get/set]
  - duration [get]
  - bufferTime [get]
  - isLive [get]
  - displayDevice [get]

  Liquid filters:
  - formatTime: Formats number of seconds as a nice readable timestamp
*/

Player.provide('video-display', 
  {
    className:'video-display',
    displayDevice:'html5',
    quality:'standard'
  }, 
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);
      $this.seekedTime = 0;

      // This one is needed to display fallback information
      Player.getter('displayDevice', function(){
          return $this.displayDevice;
      });

      // Create a container with the correct aspect ratio and a video element
      $this.canvas = $(document.createElement('div')).addClass('video-canvas')
      $this.container.append($this.canvas);

      /* PROPERTIES */
      $this.qualities = {};
      $this.rawSource = "";

      // When the module has been loaded in to the DOM, load the display device
      $this.onAppend = function(){
        $this.video = new Eingebaut($this.canvas, $this.displayDevice, '', function(e){
            // Don't send event during switching, it only confused up the UI
            if($this.video.switching && (e=='playing'||e=='pause')) return;
            // Modify event names slightly
            if(e=='loaded'||e=='ready') e = 'player'+e;
            // Fire the player event
            Player.fire('player:video:' + e);
          });
        $this.video.load();
        $this.displayDevice = $this.video.displayDevice;
        $this.loadShortcuts();
      }
      
      /* EVENT HANDLERS */
      var _togglePlayback = function(){Player.set('playing', !Player.get('playing'))}
      $this.loadShortcuts = function(){
        // Toogle playback on click
        $this.container.click(_togglePlayback);
        // Handle keyboard events
        $(window).keypress(function(e){
            if(!e.ctrlKey && !e.altKey && !e.metaKey) {
              // Toogle playbac k on space/enter press
              if(e.charCode==32 || e.keyCode==13) _togglePlayback();
              // Mute on 0 press
              if(e.charCode==48) Player.set('volume', 0);
              // Full volume on 1 press
              if(e.charCode==49) Player.set('volume', 1);
            }
          });
        $(window).keydown(function(e){
            if(!e.ctrlKey && !e.altKey && !e.metaKey) {
              // Increase volume on +/up
              if(e.charCode==43 || e.keyCode==38) Player.set('volume', Player.get('volume')+0.2);
              // Decrease volume on -/down
              if(e.charCode==45 || e.keyCode==40) Player.set('volume', Player.get('volume')-0.2);
              // Scrub on right arrow            
              if(e.keyCode==39) Player.set('currentTime', Player.get('currentTime')+30);
              // Scrub on left arrow
              if(e.keyCode==37) Player.set('currentTime', Player.get('currentTime')-30);
            }
          });
      }
      
      $this.loadContent = function(){
        // If the display device isn't ready yet, wait for it
        if(!$this.video || !$this.video.ready) {
          Player.bind('player:video:playerready', $this.loadContent);
          return;
        }
        // If no display device is supported, give up
        if($this.displayDevice=='none') return;
          
        // Load up the new video
        var v = Player.get('video');
        var s = Player.get('settings');
        
        // Handle formats or qualities
        $this.video.setPoster(Player.get('url') + v.large_download);
        $this.qualities = {};
        $this.rawSource = "";
        if($this.displayDevice!='html5' || $this.video.canPlayType('video/mp4; codecs="avc1.42E01E"')) {
          // H.264
          if (typeof(v.video_mobile_high_download)!='undefined' && v.video_mobile_high_download.length>0) 
            $this.qualities['low'] = {format:'video_mobile_high', displayName:'Low', displayQuality:'180p', codec:'h264', source:Player.get('url') + v.video_mobile_high_download};
          if (typeof(v.video_medium_download)!='undefined' && v.video_medium_download.length>0) 
            $this.qualities['standard'] = {format:'video_medium', displayName:'Standard', displayQuality:'360p', codec:'h264', source:Player.get('url') + v.video_medium_download}; 
          if (typeof(v.video_hd_download)!='undefined' && v.video_hd_download.length>0) 
            $this.qualities['hd'] = {format:'video_hd', codec:'h264', displayName:'HD', displayQuality:'720p', source:Player.get('url') + v.video_hd_download}; 
          if (typeof(v.video_1080p_download)!='undefined' && v.video_1080p_download.length>0 && v.video_1080p_size>0) 
            $this.qualities['fullhd'] = {format:'video_1080p', codec:'h264', displayName:'Full HD', displayQuality:'1080p', source:Player.get('url') + v.video_1080p_download};
        } else {
          // WebM
          if (typeof(v.video_webm_360p_download)!='undefined' && v.video_webm_360p_download.length>0) 
            $this.qualities['standard'] = {format:'video_webm_720p', codec:'webm', displayName:'Standard', displayQuality:'360p', source:Player.get('url') + v.video_webm_720p_download}; 
          if (typeof(v.video_webm_720p_download)!='undefined' && v.video_webm_720p_download.length>0) 
            $this.qualities['hd'] = {format:'video_webm_720p', codec:'webm', displayName:'HD', displayQuality:'720p', source:Player.get('url') + v.video_webm_720p_download}; 
        }
        Player.fire('player:video:qualitychange');
        if($this.qualities[$this.quality]) {
          Player.set('quality', $this.quality);
        }else{
          Player.set('quality', ($this.qualities['hd'] && s.playHD ? 'hd' : 'standard'));
        }
        
        if(s.autoPlay||s.loop) {
          // Might want to autoPlay it
          Player.set('playing', true);
        } else {
          // Otherwise fire a non-event
          Player.fire('player:video:pause', $this.video);
        }
        
        // We're ready now
        Player.fire('player:video:ready', $this.video);
      }
      Player.bind('player:video:loaded', $this.loadContent);

 
      /* SETTERS */
      Player.setter('quality', function(quality){
          // Sanity check
          if(!$this.qualities[quality]) return;

          // Update the global value
          $this.quality = quality;
          // Switch the source and jump to current spot
          var playing = Player.get('playing');
          $this.rawSource = $this.qualities[$this.quality].source;
          $this.video.setSource($this.rawSource, Player.get('currentTime'));
          Player.fire('player:video:sourcechange');
          Player.fire('player:video:qualitychange');
          Player.set('playing', playing);
      });

      Player.setter('playing', function(playing){
          $this.video.setPlaying(playing);
      });
      Player.setter('paused', function(paused){
          $this.video.setPaused(paused);
      });
      Player.setter('currentTime', function(currentTime){
          $this.video.setCurrentTime(currentTime);
      });
      Player.setter('volume', function(volume){
          $this.video.setVolume(volume);
      });

      /* GETTERS */
      Player.getter('seekedTime', function(){
          return $this.seekedTime||0;
      });
      Player.getter('quality', function(){
          return $this.quality;
      });
      Player.getter('qualities', function(){
          return $this.qualities;
      });
      Player.getter('qualitiesArray', function(){
          var ret = [];
          $.each($this.qualities, function(i,o){
              o.quality = i;
              ret.push(o);
            });
          return ret;
      });

      Player.getter('playing', function(){
          return $this.video.getPlaying();
      });
      Player.getter('currentTime', function(){
          return $this.video.getCurrentTime();
      });
      Player.getter('volume', function(){
          return $this.video.getVolume();
      });
      Player.getter('ended', function(){
          return $this.video.getEnded();
      });
      Player.getter('seeking', function(){
          return $this.video.getSeeking();
      });
      Player.getter('stalled', function(){
          return $this.video.getStalled();
      });
      Player.getter('paused', function(){
          return $this.video.getPaused();
      });
      Player.getter('duration', function(){
          return $this.video.getDuration();
      });
      Player.getter('bufferTime', function(){
          return $this.video.getBufferTime();
      });
      Player.getter('isLive', function(){
          return $this.video.getIsLive();
      });
      Player.getter('src', function(){
          return $this.video.getSource();
      });
      Player.getter('videoElement', function(){
          return $this.video;
      });
      
      return $this;
  }
);


Liquid.Template.registerFilter({
    formatTime: function(time) {
      if (isNaN(time)||time<0) return("");
      time = Math.round(time);
      return(Math.floor(time/60).toString() +':'+ (time%60<10?'0':'') + Math.round(time%60).toString());
    }
  });
