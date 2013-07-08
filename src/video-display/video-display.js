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
  - player:video:beforeplay
  - player:video:play
  - player:video:playing
  - player:video:pause
  - player:video:loadedmetadata
  - player:video:ended
  - player:video:volumechange   
  - player:video:playerloaded
  - player:video:playerready
  - player:video:sourcechange
  - player:video:qualitychange
  
  Answers properties:
  - playing [get/set]
  - currentTime [get/set]
  - seekedTime [get]
  - volume [get/set]
  - supportsVolumeChange [get]
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
  - verticalPadding [get]
  - horizontalPadding [get]
  - displayDevice [get]

  Liquid filters:
  - formatTime: Formats number of seconds as a nice readable timestamp
*/

Player.provide('video-display', 
  {
    className:'video-display',
    displayDevice:'html5',
    quality: '',
    autoPlay: false,
    showThumbnailOnEnd: true,
    fullscreenQuality: '',
    start:0,
    verticalPadding:0,
    horizontalPadding:0
  }, 
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);
      $this.seekedTime = 0;

      // Allow `displayDevice` to be set in embed code
      if(typeof(Player.parameters.displayDevice)!='undefined') $this.displayDevice = Player.parameters.displayDevice;

      // This one is needed to display fallback information
      Player.getter('displayDevice', function(){
          return $this.displayDevice;
      });

      // Create a container with the correct aspect ratio and a video element
      $this.canvas = $(document.createElement('div')).addClass('video-canvas');
      $this.container.append($this.canvas);

      /* PROPERTIES */
      $this.qualities = {};
      $this.rawSource = "";

      // Logic to load the display device with Eingebaut
      $this._queuePlay = false;
      $this.loadEingebaut = function(){
          $this.canvas.html('');
          $this.video = new Eingebaut($this.canvas, $this.displayDevice, '', function(e){
              // Error if no display device is available
              if(e=='loaded'&&$this.video.displayDevice=='none') {
                  Player.set('error', 'This player requires a modern web browser or a recent version of Adobe Flash.');
              }
              // If this loads after the content (i.e. if we're switching display device, fire an event that we're ready)
              if(e=='loaded') {
                var _v = Player.get('video');
                if(_v) Player.fire('player:video:loaded', _v);
              }
              if((e=='canplay'||e=='loaded')&&$this._queuePlay) {
                $this.video.setPlaying(true);
                $this._queuePlay = false;
              }
              // Don't send event during switching, it only confuses the UI
              if($this.video.switching && (e=='playing'||e=='pause')) return;
              // Modify event names slightly
              if(e=='loaded'||e=='ready') e = 'player'+e;
              // Fire the player event
              Player.fire('player:video:' + e);
            });
        $this.video.load();
        $this.video.showPosterOnEnd = $this.showThumbnailOnEnd;
        $this.displayDevice = $this.video.displayDevice;
      };

      // When the module has been loaded in to the DOM, load the display device    
      $this.onAppend = function(){
        $this.loadEingebaut();
        $this.loadShortcuts();
      }
      
      /* EVENT HANDLERS */
      var _togglePlayback = function(){Player.set('playing', !Player.get('playing'))}
      $this.loadShortcuts = function(){
        // Toogle playback on click
        $this.container.click(_togglePlayback);
        // Handle keyboard events
        $(document).keypress(function(e){
            try {if(Player.get('playflowActive')) return;} catch(e){}
            if(!e.ctrlKey && !e.altKey && !e.metaKey) {
              var matched = false;
              // Toogle playback on space/enter press
              if(e.charCode==32 || e.keyCode==13 || e.keyCode==32) {
                _togglePlayback();
                matched = true;
              }
              // Mute on 0 press
              if(e.charCode==48 || e.keyCode==48) {
                Player.set('volume', 0);
                matched = true;
              }
              // Full volume on 1 press
              if(e.charCode==49 || e.keyCode==49) {
                Player.set('volume', 1);
                matched = true;
              }
              
              if (matched) e.preventDefault();
            }
          });
        $(document).keydown(function(e){
            try {if(Player.get('playflowActive')) return;} catch(e){}
            if(!e.ctrlKey && !e.altKey && !e.metaKey) {
              var matched = false;
              // Increase volume on +/up
              if(e.charCode==43 || e.keyCode==38) {
                Player.set('volume', Player.get('volume')+0.2);
                matched = true;
              }
              // Decrease volume on -/down
              if(e.charCode==45 || e.keyCode==40) {
                Player.set('volume', Player.get('volume')-0.2);
                matched = true;
              }
              // Scrub on right arrow            
              if(e.keyCode==39) {
                Player.set('currentTime', Player.get('currentTime')+30);
                matched = true;
              }
              // Scrub on left arrow
              if(e.keyCode==37) {
                Player.set('currentTime', Player.get('currentTime')-30);
                matched = true;
              }
              
              if(matched) e.preventDefault();
            }
          });
      }

      // Merge in player settings
      Player.bind('player:settings', function(e,s){
        PlayerUtilities.mergeSettings($this, ['autoPlay', 'start', 'verticalPadding', 'horizontalPadding', 'displayDevice', 'fullscreenQuality']);
        if($this.video&&$this.video.displayDevice!=$this.displayDevice) $this.loadEingebaut();
        $this.container.css({left:$this.horizontalPadding+'px', bottom:$this.verticalPadding+'px'});
      });
      
      $this._currentTime = false;
      $this._loadVolumeCookie = true;
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

        // Set poster
        $this.video.setPoster(Player.get('url') + v.large_download + '/thumbnail.jpg');

        // Reset qualities
        $this.qualities = {};
        $this.rawSource = "";

        if (v.type=='clip') {
          // ON DEMAND VIDEO
          // Handle quality defaults
          $this.quality = $this.quality || s.defaultQuality || 'standard';
          if($this.quality=='high') $this.quality = 'hd';
          
          // Handle formats or qualities

          // Chrome has a bug in seeking h264 files, which we've worked around recently; but for older clips
          // the better choice is to play with webm when possible.
          preferWebM = (/Chrome/.test(navigator.userAgent) && v.photo_id<7626643 && typeof(v.video_webm_360p_download)!='undefined' && v.video_webm_360p_download.length>0 && $this.video.canPlayType('video/webm'));

          if( ($this.displayDevice!='html5' || $this.video.canPlayType('video/mp4; codecs="avc1.42E01E"')) && !preferWebM ) {
            // H.264
            if (typeof(v.video_1080p_download)!='undefined' && v.video_1080p_download.length>0 && v.video_1080p_size>0) 
              $this.qualities['fullhd'] = {format:'video_1080p', codec:'h264', displayName:'Full HD', displayQuality:'1080p', source:Player.get('url') + v.video_1080p_download};
            if (typeof(v.video_hd_download)!='undefined' && v.video_hd_download.length>0) 
              $this.qualities['hd'] = {format:'video_hd', codec:'h264', displayName:'HD', displayQuality:'720p', source:Player.get('url') + v.video_hd_download}; 
            if (typeof(v.video_medium_download)!='undefined' && v.video_medium_download.length>0) 
              $this.qualities['standard'] = {format:'video_medium', displayName:'Standard', displayQuality:'360p', codec:'h264', source:Player.get('url') + v.video_medium_download}; 
            if (typeof(v.video_mobile_high_download)!='undefined' && v.video_mobile_high_download.length>0) 
              $this.qualities['low'] = {format:'video_mobile_high', displayName:'Low', displayQuality:'180p', codec:'h264', source:Player.get('url') + v.video_mobile_high_download};
          } else if (typeof(v.video_webm_360p_download)!='undefined' && v.video_webm_360p_download.length>0 && $this.video.canPlayType('video/webm')) {
            // WebM (if there are available clips)
            if (typeof(v.video_webm_720p_download)!='undefined' && v.video_webm_720p_download.length>0) 
              $this.qualities['hd'] = {format:'video_webm_720p', codec:'webm', displayName:'HD', displayQuality:'720p', source:Player.get('url') + v.video_webm_720p_download}; 
            if (typeof(v.video_webm_360p_download)!='undefined' && v.video_webm_360p_download.length>0) 
              $this.qualities['standard'] = {format:'video_webm_720p', codec:'webm', displayName:'Standard', displayQuality:'360p', source:Player.get('url') + v.video_webm_360p_download}; 
          } else if($this.displayDevice=='html5' && !$this.video.canPlayType('video/mp4; codecs="avc1.42E01E"')) {
            // Switch to a Flash display device when WebM isn't available
            Player.set('loading', true);
            $this.displayDevice = 'flash';
            $this.loadEingebaut();
            if($this.displayDevice!='flash') {
                Player.set('error', "This clip required Adobe Flash to be installed.");
            }
          }
        } else if (v.type=='stream') {
          // LIVE VIDEO
          $this.start = 0; // Reset the start parameter for live video
          if($this.displayDevice=='html5' && $this.video.canPlayType('application/vnd.apple.mpegurl')) {
            // The current Eingebaut display is html5 and Apple HLS is supported. This feels like the future.
            $this.qualities['standard'] = {format:'hls', codec:'unknown', displayName:'Automatic', displayQuality:'unknown', source:v.http_stream};
          } else if($this.displayDevice=='flash') {
            // Flash has been loaded, so we can throw an HDS stream at the display and have it work.
            $this.qualities['standard'] = {format:'hds', codec:'unknown', displayName:'Automatic', displayQuality:'unknown', source:v.hds_stream};
          } else {
            // Switch to a Flash dispay device for playing the stream
            Player.set('loading', true);
            $this.displayDevice = 'flash';
            $this.loadEingebaut();
            if($this.displayDevice!='flash') {
                Player.set('error', "Live streaming requires a browser with support for HTTP Live Streaming or with Adobe Flash installed.");
            }
          }
        } else {
          Player.fail('Unknown video type loaded');
        }

        Player.fire('player:video:qualitychange');
        $this._currentTime = $this.start;
        if($this.qualities[$this.quality]) {
          Player.set('quality', $this.quality);
        }else{
          Player.set('quality', 'standard');
        }

        // Possibly load volume preference from previous session
        if($this._loadVolumeCookie&&$this.video) {
          var cookieVolume = Cookie.get('playerVolume');
          if(cookieVolume.length>0) Player.set('volume', new Number(cookieVolume));
          $this._loadVolumeCookie = false;
        }
        
        if($this.autoPlay) {
          // Might want to autoPlay it 
          // (iOS + Windows Phone 8 requires user interaction to start playback and thus won't support auto play apart from in edge cases)
          if(!/(iPhone|iPod|iPad|Windows.Phone)/.test(navigator.userAgent)) {
            Player.set('playing', true);
          }
        } else {
          // Otherwise fire a non-event
          Player.fire('player:video:pause', $this.video);
        }
        
        // We're ready now
        Player.fire('player:video:ready', $this.video);
      }
      Player.bind('player:video:loaded', $this.loadContent);


      // After playback has started once, don't use the `start` parameter any longer
      Player.bind('player:video:playing', function(){
          Player.set('start', 0);
      });

      // In some cases, we want to switch up the quality when going to full screen
      Player.bind('player:video:enterfullscreen', function(e){
        if($this.fullscreenQuality.length && $this.qualities[$this.fullscreenQuality]) {
          var q = Player.get('quality');
          if(q!=$this.fullscreenQuality) {
            Player.set('quality', $this.fullscreenQuality);
          }
        }
      });
 
      /* SETTERS */
      Player.setter('quality', function(quality){
          // Sanity check
          if(!$this.qualities[quality]) return;

          // Update the global value
          $this.quality = quality;
          // Switch the source and jump to current spot
          var playing = Player.get('playing');
          $this.rawSource = $this.qualities[$this.quality].source;
          $this.video.setSource($this.rawSource, ($this._currentTime === false ? Player.get('currentTime') : $this._currentTime));
          $this._currentTime = false;
          Player.fire('player:video:sourcechange');
          Player.fire('player:video:qualitychange');
          Player.set('playing', playing);
      });

      Player.setter('playing', function(playing){
          try {
              if($this.video) {                
                  if(playing && !Player.get('playing') && !Player.fire('player:video:beforeplay')) return false;
                  $this.video.setPlaying(playing);
              }
          }catch(e){
              $this._queuePlay = true;
          }
      });
      Player.setter('paused', function(paused){
          if($this.video) $this.video.setPaused(paused);
      });
      Player.setter('currentTime', function(currentTime){
          if($this.video) $this.video.setCurrentTime(currentTime);
      });
      Player.setter('volume', function(volume){          
          if($this.video) {
              $this.video.setVolume(volume);
              Cookie.set('playerVolume', new String(volume));
          }
      });
      Player.setter('start', function(s){          
          $this.start = s;
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
          return ($this.video ? $this.video.getPlaying() : false);
      });
      Player.getter('currentTime', function(){
          return ($this.video && isFinite($this.video.getCurrentTime()) ? $this.video.getCurrentTime() : 0);
      });
      Player.getter('volume', function(){
          return ($this.video ? $this.video.getVolume() : 1);
      });      
      Player.getter('supportsVolumeChange', function(){
          try {
              return $this.video.supportsVolumeChange();
          }catch(e) {return true;}
      });      
      Player.getter('ended', function(){
          return ($this.video ? $this.video.getEnded() : false);
      });
      Player.getter('seeking', function(){
          return ($this.video ? $this.video.getSeeking() : true);
      });
      Player.getter('stalled', function(){
          return ($this.video ? $this.video.getStalled() : true);
      });
      Player.getter('paused', function(){
          return ($this.video ? $this.video.getPaused() : true);
      });
      Player.getter('duration', function(){
          return ($this.video ? $this.video.getDuration()||Player.get('video_duration') : Player.get('video_duration'));
      });
      Player.getter('bufferTime', function(){
          return ($this.video ? $this.video.getBufferTime() : 0);
      });
      Player.getter('isLive', function(){
          return ($this.video ? $this.video.getIsLive() : false);
      });
      Player.getter('src', function(){
          return ($this.video ? $this.video.getSource() : '');
      });
      Player.getter('videoElement', function(){
          return $this.video;
      });
      Player.getter('horizontalPadding', function(){
          return $this.horizontalPadding;
      });
      Player.getter('verticalPadding', function(){
          return $this.verticalPadding;
      });
      Player.getter('isTouchDevice', function(){
          return !!('ontouchstart' in window) // works on most browsers 
              || !!('onmsgesturechange' in window); // works on ie10
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
