/* 
  MODULE: SUBTITLES
  Show subtitles for the video

  Listens for:
  - player:video:progress
  - player:video:timeupdate
  - player:video:seeked
  - player:video:ended
  - player:video:loaded
  - player:settings

   Fires:
   - player:subtitlechange

   Answers properties:
   - hasSubtitles [get]
   - subtitleText [get/set]
   - subtitles [get/set]
   - locales [get]
   - localesArray [get]
   - subtitleLocale [get/set]
*/

Player.provide('subtitles', 
  {
    enableSubtitles: true,
    subtitlesOnByDefault: false,
    subtitlesDesign: 'bars'
  },
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);

      // Properties
      var _reset = function(){
        $this.locales = {};
        $this.subtitleLocale = '';
        $this.subtitles = [];
        $this.subtitleText = '';
        $this.defaultLocale = '';
        $this.hasSubtitles = false;
        Player.set('subtitles', '');
        Player.fire('player:subtitlechange');
      };

      /* GETTERS */
      Player.getter('enableSubtitles', function(){return $this.enableSubtitles;});
      Player.getter('hasSubtitles', function(){return $this.hasSubtitles;});
      Player.getter('subtitleText', function(){return $this.subtitleText;});
      Player.getter('subtitles', function(){return $this.subtitles;});
      Player.getter('locales', function(){return $this.locales;});
      Player.getter('localesArray', function(){
          var ret = [];
          $.each($this.locales, function(i,o){
              ret.push(o);
            });
          return ret;
        });
      Player.getter('subtitleLocale', function(){return $this.subtitleLocale;});
      /* SETTERS */
      Player.setter('enableSubtitles', function(es){
          $this.enableSubtitles = es;
          $this.render();
          Player.fire('player:subtitlechange');
        });
      Player.setter('subtitleLocale', function(sl){
          if($this.locales[sl]) {
              _loadSubtitleLocale(sl);
              $this.subtitleLocale = sl;
              $this.enableSubtitles = true;
          } else {
              $this.subtitleLocale = '';
              $this.subtitles = [];
              $this.render();
          }
          Player.fire('player:subtitlechange');
        });
      Player.setter('subtitleText', function(st){
          if(typeof(st)!='object') st = (st=='' ? [] : [st]);
          if($this.subtitleText!=st){
            $this.subtitleText = st;
            $this.render();
          }
        });
      Player.setter('subtitles', function(s){
          $this.subtitles = s;
          Player.fire('player:subtitlechange');
          $this.possiblyRender();
        });

      // Subtitle rendering
      // Listens to events and rerenders accordingly
      var _onByDefault = false;
      Player.bind('player:settings', function(e,s){
          PlayerUtilities.mergeSettings($this, ['enableSubtitles', 'subtitlesOnByDefault', 'subtitlesDesign']);
          $this.container.removeClass('design-bars').removeClass('design-outline');
          $this.container.addClass('design-' + $this.subtitlesDesign||'bars');
          _onByDefault = s.subtitlesOnByDefault||false;
          Player.fire('player:subtitlechange');
        });
      Player.bind('player:video:play play:video:playing player:video:pause player:video:progress player:video:timeupdate player:video:seeked', function(e,o){
          $this.possiblyRender();
        });
      Player.bind('player:video:ended', function(e,o){
          Player.set('subtitleText', '');
        });
      $this.possiblyRender = function(){
        if(Player.get('playing') && $this.subtitles.length>0) {
          var time = Player.get('currentTime');
          var text = '';
          $.each($this.subtitles, function(i,s){
              if(time>=s.timestamp_begin && time<s.timestamp_end) {
                text = s.text;
              }
            });
          Player.set('subtitleText', text);
        } else {
          Player.set('subtitleText', '');
        }
      };
      $this.possiblyInsertSubtitleTracks = function(){
        if (/iPhone|iPad/.test(navigator.userAgent)) {
          var ve = Player.get("videoElement");
          if (typeof(ve) != "undefined") {
            v = $(ve.video[0]);
          } else {
            return;
          }
          v.find("track").remove();
          $.each($this.locales, function(i,o){
            var track = $("<track>");
            track.attr("kind", "subtitles");
            track.attr("src", o.href.replace(/\.srt|\.websrt/,".vtt"));
            track.attr("srclang", o.locale.match(/^([^_]+)_/)[1]);
            track.attr("label", o.language.match( /^([^\(]+)\(/ )[1]);
            if (o.default_p && _onByDefault && !/iPad/.test(navigator.userAgent)) {
              track.prop("default", true);
            }
            v.append(track);
          });
          $this.bindFullscreenListeners(v);
        }
      };
      $this.fullscreenListenersBound = false;
      $this.bindFullscreenListeners = function(v){
        if (/iPad/.test(navigator.userAgent) && !$this.fullscreenListenersBound) {
          var ve = v.get(0);
          // Possibly show track elements when we enter fullscreen
          ve.addEventListener('webkitbeginfullscreen', function(){
            for (var i = 0; i < ve.textTracks.length; i += 1) {
              if (ve.textTracks[i].language == Player.get("subtitleLocale").substr(0,2)) {
                ve.textTracks[i].mode = "showing";
              } else {
                ve.textTracks[i].mode = "disabled";
              }
            }
          }, false);
          // Disable native track elements when we leave fullscreen
          // and mirror showing/disabled subtitles in the subtitles module
          ve.addEventListener('webkitendfullscreen', function(){
            var _showingSubtitlesFound = false;
            for (var i = 0; i < ve.textTracks.length; i += 1) {
              if (ve.textTracks[i].mode == "showing") {
                $.each($this.locales, function(a,o){
                  if (ve.textTracks[i].language == o.locale.substr(0,2)) {
                    Player.set("subtitleLocale", o.locale);
                    _showingSubtitlesFound = true;
                  }
                });
              }
              ve.textTracks[i].mode = "disabled";
            }
            if (!_showingSubtitlesFound) {
              Player.set("subtitleLocale", "");
            }
          }, false);
        }
        $this.fullscreenListenersBound = true;
      };

      // Load some list of available subtitles
      // Uses the /api/photo/subtitle/list API endpoint
      Player.bind('player:video:loaded', function(e,v){
          _reset();
          if(typeof(v.subtitles_p)!='undefined' && v.subtitles_p) {
            Player.get('api').photo.subtitle.list(
                {photo_id:Player.get('video_photo_id'), token:Player.get('video_token')},
                function(data){
                    // Load a list of languages to support
                    $this.defaultLocale = '';
                    $this.hasSubtitles = false;
                    $.each(data.subtitles, function(i,o){
                        $this.hasSubtitles = true;
                        if(o.default_p) $this.defaultLocale = o.locale;
                        $this.locales[o.locale] = o;
                      });
                    Player.set('subtitleLocale', (_onByDefault?$this.defaultLocale:''));
                    $this.possiblyInsertSubtitleTracks();
                },
                Player.fail
            );
          }
        });

      // Load subtitle data for individual locales, includes local caching
      // Uses the /api/photo/subtitle/data API endpoint
      var _loadedSubtitleObjects = {};
      var _loadSubtitleLocale = function(locale){
        var key = Player.get('video_photo_id') + '-' + locale;
        Player.set('subtitles', '');
        if(_loadedSubtitleObjects[key]) {
          Player.set('subtitles', _loadedSubtitleObjects[key]);
        } else {
          Player.get('api').photo.subtitle.data(
              {photo_id:Player.get('video_photo_id'), token:Player.get('video_token'), locale:locale, subtitle_format:'json'},
              function(data){
                var s = $.parseJSON(data.data.json);
                _loadedSubtitleObjects[key] = s.subtitles;
                Player.set('subtitles', s.subtitles);
              },
              Player.fail
          );
        }
      };

      _reset();
      return $this;
  }
);
