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
  - player:video:canplay
  - player:video:play
  - player:video:playing
  - player:video:pause
  - player:video:loadedmetadata
  - player:video:ended
  - player:video:volumechange   
  - player:video:displaydevice
  - player:video:flashloaded
  - player:video:html5loaded
  
  Answers properties:
  - playing [get/set]
  - currentTime [get/set]
  - seekedTime [get]
  - volume [get/set]
  - quality [get/set]
  - qualities [get]
  - ended [get]
  - seeking [get]
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
    displayDevice:'html5'
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
      $this.quality = "";
      $this.rawSource = "";

      // When the module has been loaded in to the DOM, load the display device
      $this.onAppend = function(){
        if(!$this.loadDisplayDevice($this.displayDevice)) {
          if(!$this.loadDisplayDevice($this.displayDevice=='html5' ? 'flash' : 'html5')) {
            $this.displayDevice = 'none';
            return;
          }
        }
        $this.loadShortcuts();
      }
      
      
      /* EVENT HANDLERS */
      $this.loadDisplayDevice = function(displayDevice){
        $this.displayDevice = displayDevice;
        if ($this.displayDevice=='html5') {
          // HTML5 Display
          $this.video = $(document.createElement('video'))
            .attr({'x-webkit-airplay':'allow', tabindex:0})    
            .bind('loadeddata progress timeupdate seeked canplay play playing pause loadedmetadata ended volumechange', function(e){
                Player.fire('player:video:'+e.type, $this.video, e);
              });
          if(!$this.video[0].canPlayType) {
            return false; // no html5 video
          }
          $this.canvas.append($this.video);
          // Handle size of the video canvas
          $this.container.resize(_html5Resize);
          $(window).resize(_html5Resize);

          Player.fire('player:video:html5loaded');
        } else {
          if(!swfobject.hasFlashPlayerVersion('12.0.0')) {
            return false;  // no flash support
          }

          // Flash Display
          window.FlashFallbackCallback = function(e){
            ev = {type:e};
            Player.fire('player:video:'+e, $this.video, ev);
          };
          
          // Start the Flash application up using swfobject
          // (if we should want to eliminate the swfobject dependency, that's doable: 
          //  make a simple <object> include with innerHTML after the containing object has been 
          //  placed in DOM. Only caveat is that classid must be set in IE, and not in other browsers.)
          $this.canvas.append($(document.createElement('div')).attr({'id':'FlashFallback'}));
          swfobject.embedSWF('lib/FlashFallback/FlashFallbackDebug.swf', 'FlashFallback', '100%', '100%', '10.0.0', '', {}, {allowscriptaccess:'always', allowfullscreen:'true', wmode:'opaque', bgcolor:'#000000'}, {id:'FlashFallback', name:'FlashFallback'}); 
                    
          // Emulate enough of the jQuery <video> object for our purposes
          $this.video = {
            queue:[],
            0: {
              canPlayType: function(t){return t=='video/mp4; codecs="avc1.42E01E"';},
              play:function(){$this.video.call('setPlaying', true);},
              pause:function(){$this.video.call('setPlaying', false);}
            },
            prop:function(key,value){
              if(key=='src') key='source';
              key = key.substring(0,1).toUpperCase() + key.substring(1);
              return (typeof(value)!='undefined' ? $this.video.call('set' + key, value): $this.video.call('get' + key));
            },
            call:function(method,arg1,arg2){
              if($this.video.element) {
                if(typeof(arg2)!='undefined') {
                  return $this.video.element[method](arg1,arg2);
                } else if(typeof(arg1)!='undefined') { 
                  return $this.video.element[method](arg1);
                } else {
                  return $this.video.element[method]();
                }
              } else {
                $this.video.element = document['FlashFallback']||window['FlashFallback'];
                if($this.video.element) {
                  // Run queue
                  $.each($this.video.queue, function(i,q){
                      $this.video.call(q[0],q[1],q[2]);
                    });
                  $this.video.queue = [];
                  // Run the calling method
                  $this.video.call(method,arg1,arg2);
                } else {
                  // Enqueue
                  $this.video.queue.push([method,arg1,arg2]);
                }
              }
            },
            element:undefined
          };
        }
        Player.fire('player:video:displaydevice');
        return true;
      }

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
      
      $this.loadContent = function(e,video){
        // Check that Flash is loaded, otherwise run again when it is
        if($this.displayDevice=='flash') {
          var _f = (document['FlashFallback']||window['FlashFallback']);
          if(!_f || !_f.getPaused) {
            Player.bind('player:video:flashloaded', $this.loadContent);
            return;
          }
        }
        if($this.displayDevice=='html5'&&(!$this.video||!$this.video.prop)) {
          Player.bind('player:video:html5loaded', $this.loadContent);
          return;
        }
        if($this.displayDevice=='none') return;
          
        // Load up the new video
        var v = Player.get('video');
        var s = Player.get('settings');
        
        // Resize to fit
        if($this.displayDevice=='html5') _html5Resize();
        
        // Handle formats or qualities
        $this.video.prop('poster', Player.get('url') + v.large_download);
        $this.qualities = {};
        $this.rawSource = "";
        if($this.displayDevice!='html5' || $this.video[0].canPlayType('video/mp4; codecs="avc1.42E01E"')) {
          // H.264
          if (typeof(v.video_mobile_high_download)!='undefined' && v.video_mobile_high_download.length>0) 
            $this.qualities['low'] = {format:'video_mobile_high', codec:'h264', source:Player.get('url') + v.video_mobile_high_download};
          if (typeof(v.video_medium_download)!='undefined' && v.video_medium_download.length>0) 
            $this.qualities['standard'] = {format:'video_medium', codec:'h264', source:Player.get('url') + v.video_medium_download}; 
          if (typeof(v.video_hd_download)!='undefined' && v.video_hd_download.length>0) 
            $this.qualities['hd'] = {format:'video_hd', codec:'h264', source:Player.get('url') + v.video_hd_download}; 
          if (typeof(v.video_1080p_download)!='undefined' && v.video_1080p_download.length>0 && v.video_1080p_size>0) 
            $this.qualities['fullhd'] = {format:'video_1080p', codec:'h264', source:Player.get('url') + v.video_1080p_download};
        } else {
          // WebM
          if (typeof(v.video_webm_360p_download)!='undefined' && v.video_webm_360p_download.length>0) 
            $this.qualities['standard'] = {format:'video_webm_720p', codec:'webm', source:Player.get('url') + v.video_webm_720p_download}; 
          if (typeof(v.video_webm_720p_download)!='undefined' && v.video_webm_720p_download.length>0) 
            $this.qualities['hd'] = {format:'video_webm_720p', codec:'webm', source:Player.get('url') + v.video_webm_720p_download}; 
        }
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
          Player.fire('player:video:pause', $this.video, e);
        }
        
        // We're ready now
        Player.fire('player:video:ready', $this.video, e);
      }
      Player.bind('player:video:loaded', $this.loadContent);

 
      /* SETTERS */
      Player.setter('playing', function(playing){
          if(playing) 
              $this.video[0].play();
          else 
              $this.video[0].pause();
      });
      Player.setter('paused', function(paused){
          Player.set('playing', !paused)
      });
      Player.setter('currentTime', function(currentTime){
          $this.seekedTime = currentTime;
          try {
              $this.video.prop('currentTime', Math.max(0,currentTime));
          }catch(e){}
      });
      Player.setter('volume', function(volume){
          try {
              $this.video.prop('volume', volume);
          }catch(e){}
      });
      Player.setter('quality', function(quality){
          // Sanity check
          if(!$this.qualities[quality]) return;

          // Update the global value
          $this.quality = quality;
          // Switch the source and jump to current spot
          var currentTime = Player.get('currentTime');
          var playing = Player.get('playing');
          $this.rawSource = $this.qualities[$this.quality].source;
          $this.video.prop('src', $this.rawSource);
          Player.set('currentTime', currentTime);
          Player.set('playing', playing);
      });

      /* GETTERS */
      Player.getter('playing', function(){
          return !($this.video.prop('paused')||$this.video.prop('seeking'));
      });
      Player.getter('currentTime', function(){
          return ($this.video.prop('currentTime')||0);
      });
      Player.getter('seekedTime', function(){
          return $this.seekedTime||0;
      });
      Player.getter('volume', function(){
          return $this.video.prop('volume');
      });
      Player.getter('quality', function(){
          return $this.quality;
      });
      Player.getter('qualities', function(){
          return $this.qualities;
      });
      Player.getter('ended', function(){
          return $this.video.prop('ended');
      });
      Player.getter('seeking', function(){
          return $this.video.prop('seeking');
      });
      Player.getter('paused', function(){
          return $this.video.prop('paused');
      });
      Player.getter('duration', function(){
          return $this.video.prop('duration');
      });
      Player.getter('bufferTime', function(){
          if ($this.displayDevice=='html5') {
            var b = $this.video.prop('buffered');
            return(b && b.length ? b.end(0)||0 : 0);
          } else {
            return $this.video.prop('bufferTime')||0;
          }
      });
      Player.getter('isLive', function(){
          return($this.video.prop('isLive')||/.m3u8/.test(Player.get('src'))||/\/http$/.test(Player.get('src'))||false);
      });
      Player.getter('src', function(){
          return $this.video.prop('src');
      });
      Player.getter('videoElement', function(){
          return $this.video;
      });

      // Utility method to size the HTML5 video element
      var _html5Resize = function(){
        var v = Player.get('video');
        if(!v||!v.aspectRatio) return;
        
        var conw = $this.container.width();
        var conh = $this.container.height();
        if(conw==0 || conh==0) return;
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
