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
  - pendingCurrentTime [set]
  - seekedTime [get]
  - volume [get/set]
  - supportsVolumeChange [get]
  - quality [get/set]
  - qualityMenuExpanded [get/set]
  - subtitleMenuExpanded [get/set]
  - qualities [get]
  - ended [get]
  - seeking [get]
  - stalled [get]
  - paused [get/set]
  - duration [get]
  - liveDuration [get]
  - bufferTime [get]
  - isStream [get]
  - isLive [get]
  - maxLengthDVR [get]
  - liveBufferRegion [get]
  - liveLatencyMode [get/set]
  - liveLatency [get]
  - liveSyncDurationCount [get]
  - maxLiveSyncPlaybackRate [get]
  - displayDevice [get]
  - verticalPadding [get]
  - horizontalPadding [get]
  - displayDevice [get]

  Liquid filters:
  - formatTime: Formats number of seconds as a nice readable timestamp
  - formatTimeToReadable: Formats number of seconds as a nice readable time, mentioning the words minutes and seconds
*/

Player.provide('video-display',
  {
    className: 'video-display',
    displayDevice: 'html5',
    videoFit: 'contain',
    quality: '',
    autoPlay: false,
    autoMute: false,
    ambient: false,
    loop: false,
    mutedAutoPlay: false,
    unmuteButtonPosition: 'rightTop',
    inlinePlayback: true,
    showThumbnailOnEnd: false,
    qualityMenuExpanded: false,
    subtitleMenuExpanded: false,
    fullscreenQuality: '',
    verticalPadding: 0,
    horizontalPadding: 0,
    maxLengthDVR: 10800,
    liveBufferRegion: 60,
    hlsjsDebug: false,
    liveLatencyMode: 'medium',
    hlsjsAbrBandWidthFactor: 0.95,
    hlsjsAbrBandWidthUpFactor: 0.7
  },
  function (Player, $, opts) {
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

      var _toggleMuteButton = $("<div class='toggle-mute-button'>Turn on sound</div>");
      $this.container.append(_toggleMuteButton);

      var _360Screen = $("<div class='screen-360'></div>");
      $this.container.append(_360Screen);

      /* PROPERTIES */
      $this.qualities = {};
      $this.rawSource = "";

      // Logic to load the display device with Eingebaut
      $this._queuePlay = false;
      $this.muteVideoElementEvents = false;
      $this.loadEingebaut = function(displayDevice, callback){
          if (displayDevice) {$this.displayDevice = displayDevice;}
          var callback = callback || function(e){
            // Error if no display device is available
            if(e=='loaded'&&$this.video.displayDevice=='none') {
              Player.set('error', "this_player_requires");
            }
            if(e=='loaded') {
              var _v = Player.get('video');
              if(_v) Player.fire('player:video:loaded', _v);
            }
            if((e=='canplay'||e=='loaded')&&$this._queuePlay) {
              try {
                $this.video.setPlaying(true);
                $this._queuePlay = false;
              } catch(e){}
            }
            // Don't send event during switching, it only confuses the UI
            if($this.video.switching && (e=='playing'||e=='pause')) return;
            // Modify event names slightly
            if(e=='loaded'||e=='ready') e = 'player'+e;
            // Fire the player event
            if(!Player.get('muteVideoElementEvents')) Player.fire('player:video:' + e);
          };

          // Safari 6.1+ should just go with HTML5
          if($this.displayDevice=='flash') {
            try {
              var m = navigator.appVersion.match(/Version\/(\d+\.\d+(\.\d+)?) Safari/);
              if(m && parseFloat(m[1])>=6.1) $this.displayDevice = 'html5';
            }catch(e){}
          }

          $this.canvas.html('');
          $this.video = new Eingebaut($this.canvas, $this.displayDevice, '', callback, {inlinePlayback: $this.inlinePlayback, startMuted: $this.autoMute});
          $this.video.hlsjsConfig = {
              debug: ($this.hlsjsDebug ? true : false),
              abrBandWidthFactor: $this.hlsjsAbrBandWidthFactor,
              abrBandWidthUpFactor: $this.hlsjsAbrBandWidthUpFactor,
              maxLiveSyncPlaybackRate: Player.get('maxLiveSyncPlaybackRate'),
              liveSyncDurationCount: Player.get('liveSyncDurationCount')
          };
          $this.video.load();
          $this.video.showPosterOnEnd = $this.showThumbnailOnEnd;
          $this.video.setProgramDateHandling(true);
          $this.video.video.attr({'aria-label': Player.translate("video_element_play_pause")});
          $this.displayDevice = $this.video.displayDevice;
      };
      Player.setter('muteVideoElementEvents', function(mvee){$this.muteVideoElementEvents = mvee;});
      Player.getter('muteVideoElementEvents', function(){return $this.muteVideoElementEvents;});

      // When the module has been loaded in to the DOM, load the display device
      $this.onAppend = function(){
        $this.loadEingebaut();
      }

      // Merge in player settings
      Player.bind('player:settings', function(e,s){
        PlayerUtilities.mergeSettings($this, ['autoPlay', 'mutedAutoPlay', 'autoMute', 'ambient', 'loop', 'verticalPadding', 'horizontalPadding', 'displayDevice', 'fullscreenQuality', 'showThumbnailOnEnd', 'inlinePlayback', 'hlsjsDebug', 'hlsjsAbrBandWidthFactor', 'hlsjsAbrBandWidthUpFactor', 'liveLatencyMode', 'videoFit']);
        $this.canvas.addClass('video-canvas-fit-' + $this.videoFit)
        if (typeof (_AP) != 'undefined' && _AP === false && $this.autoPlay && !($this.autoMute || $this.mutedAutoPlay)) $this.autoPlay = false;
        if ($this.video) $this.video.hlsjsConfig = { debug: ($this.hlsjsDebug ? true : false), abrBandWidthFactor: $this.hlsjsAbrBandWidthFactor, abrBandWidthUpFactor: $this.hlsjsAbrBandWidthUpFactor };
        if($this.video) $this.video.showPosterOnEnd = $this.showThumbnailOnEnd;
        if(
          ($this.video&&$this.video.displayDevice!=$this.displayDevice)
          ||
          $this.autoMute || $this.mutedAutoPlay
        ) {
          $this.loadEingebaut();
        }
        $this.container.css({left:$this.horizontalPadding+'px', bottom:$this.verticalPadding+'px'});
      });
      Player.bind('player:video:playerready', function(){
          if($this._waiting) {
              $this.loadContent();
          }
          $this._waiting = false;
      });

      $this._loadVolumeCookie = true;
      $this.loadContent = function(){
        if ($this.video && typeof $this.video.controller != 'undefined' && $this.video.controller != '') return;

        // If the display device isn't ready yet, wait for it
        if(!$this.video || !$this.video.ready) {
          $this._waiting = true;
          return;
        }

        // If no display device is supported, give up
        if($this.displayDevice=='none') return;

        // Load up the new video
        var v = Player.get('video');
        var s = Player.get('settings');

        // Set poster
        var videoPoster = (v.type=='clip' ? v.large_download + '/thumbnail.jpg' : v.preview_large_download);
        try {
          $this.video.setPoster(Player.get('url') + videoPoster);
        }catch(e){}

        // Reset qualities
        $this.qualities = {};
        $this.rawSource = "";

        if (v.type=='clip') {
          // ON DEMAND VIDEO
          // Handle formats or qualities

          // Chrome has a bug in seeking h264 files, which we've worked around recently; but for older clips
          // the better choice is to play with webm when possible.
          preferWebM = (/Chrome/.test(navigator.userAgent) && v.photo_id<7626643 && typeof(v.video_webm_360p_download)!='undefined' && v.video_webm_360p_download.length>0 && $this.video.canPlayType('video/webm'));

          // HTTP Live Streaming
          if (typeof(v.video_hls_download)!='undefined' && v.video_hls_download.length>0 && v.video_hls_size>0 && ($this.video.canPlayType('application/vnd.apple.mpegURL')||swfobject.hasFlashPlayerVersion('10.1.0'))) {
            $this.qualities['auto'] = {format:'video_hls', codec:'hls', displayName:'Auto', displayQuality:'Auto', source:Player.get('url') + v.video_hls_download, sortkey: 6};
          }

          // Turn on Mischung when applicable either if the source is admin, or if there's no transcoded version
          if (typeof(Mischung)!='undefined' && typeof(v.mischung_p)!='undefined' && v.mischung_p && $this.displayDevice!='mischung') {
            if(
              (typeof(v.video_original_download)!='undefined' && v.video_original_download.length>0)
              &&
              (Player.get('source')=='admin' || typeof(v.video_medium_download)=='undefined' || v.video_medium_download.length=='')
            ) {
              Player.set('loading', true);
              $this.displayDevice = 'mischung';
              $this.loadEingebaut();
              if($this.displayDevice!='mischung') {
                Player.set('error', "this_clip_requires");
              }
            }
          }

          if ($this.displayDevice=='mischung') {
            $this.qualities['standard'] = {format:'video_original', displayName:'Preview', displayQuality:'720p', codec:'h264', source:Player.get('url') + v.video_original_download, sortkey: 2};
          } else if( ($this.displayDevice!='html5' || $this.video.canPlayType('video/mp4; codecs="avc1.42E01E"')) && !preferWebM ) {
            // H.264
            if (typeof(v.video_4k_download)!='undefined' && v.video_4k_download.length>0 && v.video_4k_size>0 && !/iPhone|Android/.test(navigator.userAgent))
              $this.qualities['4k'] = {format:'video_4k', codec:'h264', displayName:'4K', displayQuality:'4K', source:Player.get('url') + v.video_4k_download, sortkey: 5};
            if (typeof(v.video_1080p_download)!='undefined' && v.video_1080p_download.length>0 && v.video_1080p_size>0 && !/Android/.test(navigator.userAgent))
              $this.qualities['fullhd'] = {format:'video_1080p', codec:'h264', displayName:'Full HD', displayQuality:'1080p', source:Player.get('url') + v.video_1080p_download, sortkey: 4};
            if (typeof(v.video_hd_download)!='undefined' && v.video_hd_download.length>0)
              $this.qualities['hd'] = {format:'video_hd', codec:'h264', displayName:'HD', displayQuality:'720p', source:Player.get('url') + v.video_hd_download, sortkey: 3};
            if (typeof(v.video_medium_download)!='undefined' && v.video_medium_download.length>0)
              $this.qualities['standard'] = {format:'video_medium', displayName:'Standard', displayQuality:'360p', codec:'h264', source:Player.get('url') + v.video_medium_download, sortkey: 2};
            if (typeof(v.video_mobile_high_download)!='undefined' && v.video_mobile_high_download.length>0)
              $this.qualities['low'] = {format:'video_mobile_high', displayName:'Low', displayQuality:'180p', codec:'h264', source:Player.get('url') + v.video_mobile_high_download, sortkey: 1};
          } else if (typeof(v.video_webm_360p_download)!='undefined' && v.video_webm_360p_download.length>0 && $this.video.canPlayType('video/webm')) {
            // WebM (if there are available clips)
            if (typeof(v.video_webm_720p_download)!='undefined' && v.video_webm_720p_download.length>0)
              $this.qualities['hd'] = {format:'video_webm_720p', codec:'webm', displayName:'HD', displayQuality:'720p', source:Player.get('url') + v.video_webm_720p_download, sortkey: 3};
            if (typeof(v.video_webm_360p_download)!='undefined' && v.video_webm_360p_download.length>0)
              $this.qualities['standard'] = {format:'video_webm_720p', codec:'webm', displayName:'Standard', displayQuality:'360p', source:Player.get('url') + v.video_webm_360p_download, sortkey: 2};
          } else if($this.displayDevice=='html5' && !$this.video.canPlayType('video/mp4; codecs="avc1.42E01E"')) {
            // Switch to a Flash display device when WebM isn't available
            Player.set('loading', true);
            $this.displayDevice = 'flash';
            $this.loadEingebaut();
            if($this.displayDevice!='flash') {
                Player.set('error', "this_clip_requires");
            }
          }
          // Handle quality defaults
          var _fallback = 'standard'; //$this.qualities['auto'] ? 'auto' : 'standard';
          $this.quality = $this.quality || s.defaultQuality || _fallback;
          if($this.quality=='high') $this.quality = 'hd';

        } else if (v.type=='stream') {
          // LIVE VIDEO
          if($this.displayDevice=='html5' && $this.video.canPlayType('application/vnd.apple.mpegurl')) {
            // The current Eingebaut display is html5 and Apple HLS is supported. This feels like the future.
            $this.qualities['standard'] = {format:'hls', codec:'unknown', displayName:'Automatic', displayQuality:'unknown', source:v.hls_stream};
            if (Player.get('stream_has_dvr')) {
                $this.qualities['dvr'] = {format:'hls', codec:'unknown', displayName:'DVR', displayQuality:'DVR', source:v.hls_dvr_stream};
            }
          } else if($this.displayDevice=='flash') {
            // Flash has been loaded, so we can throw an HLS stream at the display and have it work.
            $this.qualities['standard'] = {format:'hls', codec:'unknown', displayName:'Automatic', displayQuality:'unknown', source:v.hls_stream};
            if (Player.get('stream_has_dvr')) {
                $this.qualities['dvr'] = {format:'hls', codec:'unknown', displayName:'DVR', displayQuality:'DVR', source:v.hls_dvr_stream};
            }
          } else {
            // Switch to a Flash dislpay device for playing the stream
            Player.set('loading', true);
            $this.displayDevice = 'flash';
            $this.loadEingebaut();
            if($this.displayDevice!='flash') {
                Player.set('error', "live_streaming_requires");
            }
          }
        } else {
          Player.fail('Unknown video type loaded');
        }

        if ($this.autoMute) {
          // Auto-mute from property
          Player.set("volumeMuted", true);
        }

        try {
          Player.get('videoElement').video[0].loop = Player.get('loop');
        }catch(e){}

        Player.fire('player:video:qualitychange');

        // Set crossorigin attribute on 360 live streams playing through html5
        if (v.video_360_p === 1 && v.type === "stream" && $this.displayDevice === "html5") {
          $this.video.video.attr({"crossorigin": "anonymous"});
        }

        // Set quality
        var newQuality = '';
        if($this.qualities[$this.quality]) { // 1. Try quality chosen in player settings
          newQuality = $this.quality;
        }else if($this.qualities['standard']){ // 2. Try 'standard' quality
          newQuality = 'standard';
        }else if(Player.get('qualitiesArray').length>0){ // 3. Search for any available quality
          var qa = Player.get('qualitiesArray');
          for(var i = 0; i < qa.length; i += 1){
            if($this.qualities[qa[i]]){
              newQuality = qa[i];
            }
          }
        }

        if(newQuality!=''){
          Player.set('quality', newQuality);
        }

        // We're ready now
        Player.fire('player:video:ready', $this.video);
      }
      Player.bind('player:video:loaded', $this.loadContent);

      // In some cases, we want to switch up the quality when going to full screen
      Player.bind('player:video:enterfullscreen', function(e){
        var currentQuality = Player.get("quality");
        var newQuality = $this.fullscreenQuality;
        if( currentQuality == "auto" || Player.get("isTouchDevice") ) {
          return;
        }
        if(newQuality.length){
          // Choose best alternative if selected fullscreen quality is not available
          if(newQuality=='fullhd' && !$this.qualities['fullhd']) {newQuality = 'hd';}
          if(newQuality=='hd' && !$this.qualities['hd']) {newQuality = 'standard';}
          // Don't change if current quality is the same as the new one
          if(currentQuality!=newQuality) {
            // Never change to a lower quality than the current
            if( newQuality=='fullhd' ||
                (newQuality=='hd' && currentQuality!='fullhd') ||
                (newQuality=='standard' && currentQuality!='hd' && currentQuality!='fullhd') ){
              Player.set('quality', newQuality);
            }
          }
        }
      });

      Player.getter("360Supported", function() {
        // 360 degree video is supported when we have WebGL and html5 video...
        if (ThreeSixtyController.isSupported() && $this.displayDevice === "html5") {
          // ...with a few exceptions for Safari:

          var is_chrome = navigator.userAgent.indexOf('Chrome') > -1;
          var is_safari = navigator.userAgent.indexOf("Safari") > -1;
          if (is_chrome && is_safari) { is_safari=false; }

          if (!is_safari) { return true; }

          // Safari support status as of October '16:
          // 360 video is supported on Safari 9 and above for Mac, Safari 10 and above for iPhone
          // Except live, which is supported on Safari 10 and above for Mac and not at all on iPhone

          var is_iphone = navigator.userAgent.indexOf('iPhone') > -1;
          var matches = navigator.userAgent.match(/Version\/([0-9]+)\./);
          var safari_version;
          if (matches.length > 1) {
            safari_version = parseInt(matches[1], 10);

            if (Player.get("video_type") === "clip") {
              if (is_iphone) {
                return safari_version > 9;
              } else {
                return safari_version > 8;
              }
            } else {
              return (!is_iphone && safari_version > 9);
            }
          }
        }
        return false;
      });

      var _360handled = false;
      var notice;

      Player.bind("player:video:loaded", function(e,v) {
        ThreeSixtyController.destroy();
        _360handled = false;
        $("body").removeClass("video-360 displaying-360");
        $(".notice-360").remove();

        if (Player.get("video_is_360")) {
          $("body").addClass("video-360");

          if (Player.get("360Supported")) {

            /* Switch to highest possible quality */
            var _newQuality = $this.quality;
            if ($this.qualities["fullhd"]) {
              _newQuality = "fullhd";
            } else if ($this.qualities["hd"]) {
              _newQuality = "hd";
            }
            if (_newQuality != $this.quality) {
              Player.set("quality", _newQuality);
            }

            notice = $(
              "<div class='notice-360'>This is a 360&deg; video.<br />Use the arrow controls or drag the video to move around.<div>"
            );
            $this.container.one("mousedown touchstart", function(){
              $(".notice-360").remove();
            });
          } else {
            notice = $(
              "<div class='notice-360'>This is a 360&deg; video.<br />Watch this video in Chrome, Firefox or Edge<br />or on an Android phone to get the full experience.</div>"
            );
          }
          $this.container.append(notice);
        }

        if (v.thumbnail_360_p && Player.get("360Supported")) {
          ThreeSixtyController.init($this.container.find(".video-canvas"), function(success) {
            if (success) {
              $("body").addClass("displaying-360");
              var videoPoster = (v.type=='clip' ? v.large_download + '/thumbnail.jpg' : v.preview_large_download);
              ThreeSixtyController.renderImage(videoPoster);
            }
          });
        }
      });

      Player.bind("player:playflow:transitioned", function(e, transition) {
        if (transition.currentPosition === 3) {
          if (Player.get("video_is_360")) {
            if (Player.get("360Supported") && !_360handled) {
              _360handled = true;
              ThreeSixtyController.init($this.container.find(".video-canvas"), function(success) {
                if (success) {
                  $("body").addClass("displaying-360");
                  ThreeSixtyController.renderVideo($this.video.video);
                }
              });
            }
          } else {
            ThreeSixtyController.destroy();
          }
        }
      });

      Player.bind("player:playflow:transitioned", function(e, transition) {
        if (transition.currentPosition === 2 || transition.currentPosition === 4) {
          $("body").removeClass("displaying-360");
        }

        if (transition.currentPosition === 5 && _360handled) {
          $("body").addClass("displaying-360");
        }
      });


      /* SETTERS */
      var playableContext = null;
      Player.setter('qualities', function(qualities){
          $this.qualities = qualities;
      });
      Player.setter('quality', function(quality){
          // Sanity check
          if(!$this.qualities[quality]) return;

          // Update the global value
          $this.quality = quality;
          $this.rawSource = $this.qualities[$this.quality].source;

          // Add referer and uuid to source-url
          // Referer must not be the last parameter in the query, since "Internet" on Android
          // gets confused, if the query string ends with ".html"
          $this.rawSource += (/\?/.test($this.rawSource) ? '&' : '?') + 'referer='+encodeURIComponent(document.referrer);
          $this.rawSource += '&uuid='+Player.get('uuid');

          playableContext = {
              source: $this.rawSource,
              startTime: (Player.get("video_type") == "clip" ? Player.get("currentTime") : 0),
              displayDevice: (quality!="auto"||$this.video.canPlayType('application/vnd.apple.mpegURL')?$this.video.displayDevice:"flash"),
              callback: $this.video._callback,
              preventBackup: true
          };

          if(Player.get('video_playable')) {
            // Switch the source and jump to current spot
            var playing = Player.get('playing');
            $this.video.setContext(playableContext);
            playableContext = null;
            Player.fire('player:video:sourcechange');
            Player.fire('player:video:qualitychange');
            Player.set('playing', playing);
          } else {
            Player.set('playing', false);
          }
      });
      var _loadCalled = false;
      Player.setter('playing', function(playing){
          if(!Player.get('video_playable')) return;
          if(playableContext) {
            try {
              $this.video.setContext(playableContext);
            }catch(e){};
            playableContext = null;
          }
          try {
              if($this.video) {
                  if(playing && $this.video.ready && $this.video.displayDevice == "html5" && !_loadCalled) {
                      // Call load() to capture user interaction on touch devices. Allows us to start playback
                      // without user interaction at a later point, even if 'beforeplay' cancels playback now
                      $this.video.video[0].load();
                      _loadCalled = true;
                  }
                  if(playing && !Player.get('playing') && !Player.fire('player:video:beforeplay', true)) return false;
                  $this.video.setPlaying(playing);
              }
          }catch(e){
              $this._queuePlay = !!playing;
          }
      });
      Player.setter('paused', function(paused){
          if($this.video) $this.video.setPaused(paused);
      });
      Player.setter('currentTime', function(currentTime) {
          if (Player.get('video').type !== 'stream') {
              if ($this.video) $this.video.setCurrentTime(currentTime);
              $this.seekedTime = currentTime;
          } else {
              // Stream scrubber
              if (Player.get('quality') === 'standard') {
                  // Currently on live
                  Player.set('quality', 'dvr');
                  window.setTimeout(function(){
                    Player.set('pendingCurrentTime', currentTime);
                  }, 600);
              } else {
                  // Currently on DVR
                  if (currentTime > (Player.get('duration') - Player.get('liveBufferRegion'))) {
                      Player.set('quality', 'standard');
                  } else {
                      if ($this.video) $this.video.setCurrentTime(currentTime);
                  }
              }
          }
      });
      $this.pendingCurrentTime = -1;
      Player.setter('pendingCurrentTime', function(pct) {
          $this.pendingCurrentTime = pct;
      });
      Player.bind('player:video:timeupdate', function() {
          if ($this.pendingCurrentTime >= 0) {
              Player.set('currentTime', $this.pendingCurrentTime);
              $this.pendingCurrentTime = -1;
          }
      });
      Player.setter('volume', function(volume){
          volume = Math.max(0, Math.min(1, volume));
          if($this.video) {
            $this.video.setVolume(volume);
          }
      });
      Player.setter('volumeMuted', function(muted){
          if($this.video) {
              if(muted){
                  $this.video.setVolume(0);
              }else{
                  Player.set("volume", 1);
              }
          }
      });
      Player.setter('qualityMenuExpanded', function(expand){
        $this.qualityMenuExpanded = expand
      });
      Player.setter('subtitleMenuExpanded', function(expand){
        $this.subtitleMenuExpanded = expand
      });
      Player.setter('autoPlay', function(ap){
        $this.autoPlay = ap;
      });
      Player.setter('liveLatencyMode', function (llm) {
          if (['high', 'medium', 'low', 'ultra-low'].indexOf(llm) < 0) {
            llm = 'medium';
          }
          $this.liveLatencyMode = llm;

          var ve = Player.get('videoElement');
          if (ve && ve.hls && ve.hls.latencyController && ve.hls.latencyController.config) {
              ve.hls.latencyController.config.maxLiveSyncPlaybackRate = Player.get('maxLiveSyncPlaybackRate');
              ve.hls.latencyController.config.liveSyncDurationCount = Player.get('liveSyncDurationCount');
          }
          if ($this.video.hlsjsConfig && $this.video.hlsjsConfig) {
              $this.video.hlsjsConfig.maxLiveSyncPlaybackRate = Player.get('maxLiveSyncPlaybackRate');
              $this.video.hlsjsConfig.liveSyncDurationCount = Player.get('liveSyncDurationCount');
          }
      });
      Player.setter('playbackRate', function(rate) {
        $this.video && $this.video.setPlaybackRate(rate);
        Player.fire('player:video:playbackratechange');
      });

      /* GETTERS */
      Player.getter('seekedTime', function () {
          return $this.seekedTime || 0;
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
          ret.sort(function(a,b){
              return (isNaN(a.sortkey) ? 0 : a.sortkey) - (isNaN(b.sortkey) ? 0 : b.sortkey);
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
      Player.getter('volumeMuted', function(){return (Player.get('volume')==0);});
      Player.getter('supportsVolumeChange', function(){
          try {
              return $this.video.supportsVolumeChange();
          }catch(e) {return true;}
      });
      Player.getter('qualityMenuExpanded', function(){
          return $this.qualityMenuExpanded
      });
      Player.getter('subtitleMenuExpanded', function(){
        return $this.subtitleMenuExpanded
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
      Player.getter('duration', function() {
          if (!Player.get('isLive')) {
              var dur = ($this.video ? $this.video.getDuration() || Player.get('video_duration') : Player.get('video_duration'));
              if (isFinite(dur) && dur > 0) {
                  return dur;
              } else {
                  return $this.maxBufferTime;
              }
          } else {
              return Player.get('liveDuration');
          }
      });
      Player.getter('liveDuration', function() {
          var now = new Date(),
              secondsSinceStart = (now / 1000) - Player.get('video').broadcasting_start_time_epoch,
              duration = secondsSinceStart;

          if (secondsSinceStart > Player.get('maxLengthDVR')) {
              duration = Player.get('maxLengthDVR');
          }

          return duration;
      });
      Player.getter('bufferTime', function(){
          return ($this.video ? $this.video.getBufferTime() : 0);
      });
      Player.getter('isStream', function() {
          return (Player.get("video").type == "stream");
      });
      Player.getter('isLive', function() {
          var v = Player.get('video');
          return (v && typeof(v.type)!='undefined' && v.type === 'stream' && Player.get('quality') === 'standard');
      });
      Player.getter('maxLengthDVR', function() {
          return $this.maxLengthDVR;
      });
      Player.getter('liveBufferRegion', function() {
          return $this.liveBufferRegion;
      });
      Player.getter('liveLatencyMode', function () {
          return $this.liveLatencyMode;
      });
      Player.getter('liveLatency', function () {
          var ve = Player.get('videoElement');
          return (ve && ve.hls && ve.hls.latency || null);
      });
      Player.getter('maxLiveSyncPlaybackRate', function () {
          switch ($this.liveLatencyMode) {
              case 'ultra-low':
                  return 1.11;
              case 'low':
                  return 1.04;
              case 'medium':
              case 'high':
              default:
                  return 1;
          }
      });
      Player.getter('liveSyncDurationCount', function () {
          switch ($this.liveLatencyMode) {
              case 'ultra-low':
                  return 2;
              case 'low':
                  return 3;
              case 'medium':
                  return 4;
              case 'high':
              default:
                  return 64;
          }
      });
      Player.getter('src', function () {
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
              || !!(window.navigator.msMaxTouchPoints); // works on ie10
      });
      Player.getter('eingebautConstructor', function(){
          return $this.loadEingebaut;
      });
      Player.getter('autoPlay', function(){
          return $this.autoPlay;
      });
      Player.getter('mutedAutoPlay', function(){
          return $this.mutedAutoPlay;
      });
      Player.getter('ambient', function(){
          return $this.ambient;
      });
      Player.getter('loop', function(){
          return $this.loop;
      });
      Player.getter('playbackRate', function() {
          return ($this.video ? $this.video.getPlaybackRate() : 1);
      });
      Player.setter('mutedAutoPlay', function(map){
        $this.mutedAutoPlay = map;
        Player.set("volumeMuted", $this.mutedAutoPlay);
      });
      Player.bind('player:video:autoplayfailed', function(){
        if(Player.get('mutedAutoPlay')) {
          // Running with muted auto play
          Player.set('volumeMuted', true);
          Player.set('playing', true);
        }
      });

      // Property used for livestreams that does not have a finite value for duration
      $this.maxBufferTime = 0;
      // Flag used for resetting $this.seekedTime when a video replays from beginning
      var _seekEnded = false;
      // On timeupdate, save maximum value for bufferTime and possibly reset $this.seekedTime
      Player.bind("player:video:timeupdate",function(){
          $this.maxBufferTime = Math.max($this.maxBufferTime, Player.get("bufferTime"));
          if(_seekEnded && Player.get("currentTime") < 1){
              $this.seekedTime = 0;
              _seekEnded = false;
          }
      });
      // When new video is loaded, reset maxBufferTime and seekedTime
      Player.bind("player:video:loaded",function(){
          $this.maxBufferTime = 0;
          $this.seekedTime = Player.get("currentTime");
          _seekEnded = false;
      });
      Player.bind("player:video:seeked player:video:seek",function(e){
          $this.seekedTime = Player.get("currentTime");
      });
      Player.bind("player:video:ended", function(){
          _seekEnded = true;
      });


      /* Mischung overload */
      Player.setter('overloadMischungFile', function(misch) {
        console.log('overloadMischungFile, misch =', misch);
        if ($this.displayDevice=='mischung' && $this.video && $this.video.mischung) {
          if(typeof(misch)=='string') {
            misch = JSON.parse(misch);
          }
          $this.video.mischung.setSource(misch, 0);
        }
      });


      /* Option to block playback entirely */
      $this.blockPlayback = false;
      Player.setter('blockPlayback', function(bp) {
        $this.blockPlayback = bp;
        if($this.blockPlayback) Player.set('playing', false);
      });
      Player.getter('blockPlayback', function() {
        return $this.blockPlayback;
      });
      Player.bind('player:video:beforeplay', function(e,allowPlayback){
        return !$this.blockPlayback&&allowPlayback;
      });

      // Reconnect for livestream
      $this.reconnectIntervals = [10,10,10,8,8,8,8,8,10,10,10,10,20,20,20];
      $this.reconnectIntervalIndex = 0;
      $this.reconnectTimeoutId = 0;
      $this.handleStalled = function(){
          window.clearTimeout($this.reconnectTimeoutId);
          var v = Player.get("video");
          if(!v||v.type!="stream") return;
          $this.reconnectTimeoutId = window.setTimeout(function(){
              if(Player.get("videoElement").getStalled()||Player.get("videoElement").hlsjsFatalError){
                  console.log('Attempting reconnecting to live stream, reconnectIntervalIndex =', $this.reconnectIntervalIndex);
                  if($this.reconnectIntervalIndex <= 15){
                      Player.get("videoElement").setSource(Player.get("videoElement").getSource(), null, null, false);
                      if(Player.get("video_playable")){
                          Player.set("playing",true);
                      }
                  } else {
                      console.log('Attempting reconnecting to live stream by full reload');
                      Player.set("playing", false);
                      Player.get("video").reload();
                  }
                  if($this.reconnectIntervalIndex<$this.reconnectIntervals.length-1){
                      $this.reconnectIntervalIndex++;
                  }
                  $this.handleStalled();
              }else{
                  $this.reconnectIntervalIndex = 0;
              }
          },$this.reconnectIntervals[$this.reconnectIntervalIndex]*1000);
      };
      Player.bind('player:video:stalled player:video:waiting',$this.handleStalled);
      Player.bind('player:video:timeupdate',function(){
          if(Player.get("videoElement").getStalled()&&$this.reconnectIntervalIndex==0){
              $this.reconnectIntervalIndex = 1;
              $this.handleStalled();
          }
      });

      return $this;
  }
);

var formatTime = function(time) {
  if (isNaN(time)||time<0) return("");
  time = Math.round(time);
  return(Math.floor(time/60).toString() +':'+ (time%60<10?'0':'') + Math.round(time%60).toString());
}

var formatTimeToReadable = function(time){
  if (isNaN(time)||time<0) return("");
  time = Math.round(time);

  minute = Math.floor(time/60).toString();
  if(Math.floor(time/60).toString() == 1){
    minute += 'min';
  }else if (Math.floor(time/60).toString() > 1){
    minute += 'mins';
  } else {
    minute = '';
  }

  second = Math.round(time%60).toString();
  if(Math.round(time%60).toString() == 1){
    second += 'sec';
  }else if (Math.round(time%60).toString() != 1){
    second += 'secs';
  }

  return(minute + second);
}

Liquid.Template.registerFilter({
    formatTime: formatTime,
    formatTimeToReadable : formatTimeToReadable
  });

/* Translations for this module */
Player.translate("video_element_play_pause",{
  en: "You are currently on a video element, press space to play or pause"
});
Player.translate("this_player_requires",{
    en: "This player requires a modern web browser with video playback support."
});
Player.translate("this_clip_requires",{
    en: "This player requires a modern web browser with video playback support."
});
Player.translate("live_streaming_requires",{
    en: "Live streaming requires a browser with support for HTTP Live Streaming."
});
Player.translate("this_video_is_being_prepared",{
    en: "This video is currently being prepared for playback."
});
Player.translate("min",{
  en: " minute "
});
Player.translate("mins",{
  en: " minutes "
});
Player.translate("sec",{
  en: "second"
});
Player.translate("secs",{
  en: "seconds"
});
