/* 
  MODULE: VIDEO
  Handle all video playback for the current video 
  (including quality, buffering, scrubbing, volume, progress and skipping) 

  Fires events:
  - player:video:loadeddata
  - player:video:progress
  - player:video:timeupdate
  - player:video:seeked
  - player:video:canplay
  - player:video:play
  - player:video:playing
  - player:video:pause
  - player:video:loadedmetadata
  - player:video:ended
  - player:video:volumechange   
  
  Answers properties:
  - playing [get/set]
  - currentTime [get/set]
  - startTime [get]
  - volume [get/set]
  - quality [get/set]
  - qualities [get]
  - ended [get]
  - seeking [get]
  - paused [get/set]
  - duration [get]
  - bufferTime [get]
  - displayDevice [get]
*/

Glue.provide('video-display', {}, 

  function(Glue,$,opts){
      var $this = this;
      $.extend($this, opts);

      // Create a container with the correct aspect ratio and a video element
      $this.canvas = $(document.createElement('div')).addClass('video-canvas');
      $this.container.append($this.canvas);
      $this.video = $(document.createElement('video'))
          .attr({'x-webkit-airplay':'allow', tabindex:0})    
          .bind('loadeddata progress timeupdate seeked canplay play playing pause loadedmetadata ended volumechange', function(e){
              Glue.fire('player:video:'+e.type, $this.video, e);
          });
      $this.canvas.append($this.video);

      // Handle size of the video canvas
      var _resize = function(){
          var v = Glue.get('video');
          if(!v||!v.aspectRatio) return;

          var conw = $this.container.width();
          var conh = $this.container.height();
          var conar = conw/conh;
          if(v.apectRatio<conar) {
              $this.canvas.width(conw);
              var h = conw/v.aspectRatio;
              $this.canvas.height(h);
              $this.canvas.css({top:((conh-h)/2)+'px', left:0});
          } else {
              $this.canvas.height(conh);
              var w = conh*v.aspectRatio;
              $this.canvas.width(w);
              $this.canvas.css({top:0, left:((conw-w)/2)+'px'});
          }
      }
      $this.container.resize(_resize);
      $(window).resize(_resize);

      // Toogle playback on click
      var _togglePlayback = function(){Glue.set('playing', !Glue.get('playing'))}
      $this.container.click(_togglePlayback);
      // Handle keyboard events
      $(window).keypress(function(e){
          if(!e.ctrlKey && !e.altKey) {
            // Toogle playbac k on space/enter press
            if(e.charCode==32 || e.keyCode==13) _togglePlayback();
            // Mute on 0 press
            if(e.charCode==48) Glue.set('volume', 0);
            // Full volume on 1 press
            if(e.charCode==49) Glue.set('volume', 1);
          }
      });
      $(window).keydown(function(e){
          if(!e.ctrlKey && !e.altKey) {
            // Increase volume on +/up
            if(e.charCode==43 || e.keyCode==38) Glue.set('volume', Glue.get('volume')+0.1);
            // Decrease volume on -/down
            if(e.charCode==45 || e.keyCode==40) Glue.set('volume', Glue.get('volume')-0.1);
            // Scrub on right arrow            
            if(e.keyCode==39) Glue.set('currentTime', Glue.get('currentTime')+30);  // @siracusa
            // Scrub on left arrow
            if(e.keyCode==37) Glue.set('currentTime', Glue.get('currentTime')-30);
          }
      });

      /* PROPERTIES */
      $this.qualities = {};
      $this.quality = "";
      $this.rawSource = "";
      $this.startTime = 0;

      /* EVENT HANDLERS */
      Glue.bind('player:video:loaded', function(e,video){
          // Load up the new video
          var v = Glue.get('video');
          var s = Glue.get('settings');

          // Use and reset start time
          $this.startTime = s.start;
          s.start = 0;

          // Resize to fit
          _resize();

          // Handle formats or qualities
          $this.video.prop('poster', Glue.get('url') + v.large_download);
          $this.qualities = {};
          $this.rawSource = "";
          if($this.video[0].canPlayType('video/mp4; codecs="avc1.42E01E"')) {
              // H.264
              if (typeof(v.video_mobile_high_download)!='undefined' && v.video_mobile_high_download.length>0) 
	          $this.qualities['low'] = {format:'video_mobile_high', codec:'h264', source:Glue.get('url') + v.video_mobile_high_download};
              if (typeof(v.video_medium_download)!='undefined' && v.video_medium_download.length>0) 
	          $this.qualities['standard'] = {format:'video_medium', codec:'h264', source:Glue.get('url') + v.video_medium_download}; 
              if (typeof(v.video_hd_download)!='undefined' && v.video_hd_download.length>0) 
	          $this.qualities['hd'] = {format:'video_hd', codec:'h264', source:Glue.get('url') + v.video_hd_download}; 
              if (typeof(v.video_1080p_download)!='undefined' && v.video_1080p_download.length>0 && v.video_1080p_size>0) 
	          $this.qualities['fullhd'] = {format:'video_1080p', codec:'h264', source:Glue.get('url') + v.video_1080p_download};
          } else {
              // WebM
              if (typeof(v.video_webm_360p_download)!='undefined' && v.video_webm_360p_download.length>0) 
	          $this.qualities['standard'] = {format:'video_webm_720p', codec:'webm', source:Glue.get('url') + v.video_webm_720p_download}; 
              if (typeof(v.video_webm_720p_download)!='undefined' && v.video_webm_720p_download.length>0) 
	          $this.qualities['hd'] = {format:'video_webm_720p', codec:'webm', source:Glue.get('url') + v.video_webm_720p_download}; 
          }
          if($this.qualities[$this.quality]) {
            Glue.set('quality', $this.quality);
          }else{
            Glue.set('quality', ($this.qualities['hd'] && s.playHD ? 'hd' : 'standard'));
          }

          // Might want to autoPlay it
          if(s.autoPlay||s.loop) Glue.set('playing', true);
      });

      /* SETTERS */
      Glue.setter('playing', function(playing){
          if(playing) 
              $this.video[0].play();
          else 
              $this.video[0].pause();
      });
      Glue.setter('paused', function(paused){
          Glue.set('playing', !paused)
      });
      Glue.setter('currentTime', function(currentTime){
          try {
              $this.video.prop('currentTime', Math.max(0,currentTime));
          }catch(e){}
      });
      Glue.setter('volume', function(volume){
          try {
              $this.video.prop('volume', volume);
          }catch(e){}
      });
      Glue.setter('quality', function(quality){
          // Sanity check
          if(!$this.qualities[quality]) return;

          // Update the global value
          $this.quality = quality;
          // Switch the source and jump to current spot
          var currentTime = Glue.get('currentTime');
          var playing = Glue.get('playing');
          $this.rawSource = $this.qualities[$this.quality].source;
          $this.video.prop('src', $this.rawSource);
          Glue.set('currentTime', currentTime);
          Glue.set('playing', playing);
      });

      /* GETTERS */
      Glue.getter('playing', function(){
          return !($this.video.prop('paused')||$this.video.prop('seeking'));
      });
      Glue.getter('startTime', function(){
          return $this.startTime;
      });
      Glue.getter('currentTime', function(){
          return ($this.video.prop('currentTime')||0) + $this.startTime;
      });
      Glue.getter('volume', function(){
          return $this.video.prop('volume');
      });
      Glue.getter('quality', function(){
          return $this.quality;
      });
      Glue.getter('qualities', function(){
          return $this.qualities;
      });
      Glue.getter('ended', function(){
          return $this.video.prop('ended');
      });
      Glue.getter('seeking', function(){
          return $this.video.prop('seeking');
      });
      Glue.getter('paused', function(){
          return $this.video.prop('paused');
      });
      Glue.getter('duration', function(){
          return $this.video.prop('duration') + $this.startTime;
      });
      Glue.getter('bufferTime', function(){
          var b = $this.video.prop('buffered');
          return(b && b.length ? b.end(0)||0 : 0);
      });
      Glue.getter('src', function(){
          return $this.video.prop('src');
      });
      Glue.getter('displayDevice', function(){
          return 'html5';
      });
      
      return $this;
  }
          
);
