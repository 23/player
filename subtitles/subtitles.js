/* 
  MODULE: SUBTITLES
  Show subtitles for the video

  Listens for:
  - player:video:progress
  - player:video:timeupdate
  - player:video:seeked
  - player:video:ended

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
  {},
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);

      // Properties
      var _reset = function(){
        $this.enableSubtitles = true;
        $this.hasSubtitles = false;
        $this.locales = {};
        $this.subtitleLocale = '';
        $this.subtitles = [];
        $this.subtitleText = '';
        $this.defaultLocale = '';
      }
      _reset();

      /* GETTERS */
      Player.getter('enableSubtitles', function(){return $this.enableSubtitles;});
      Player.getter('hasSubtitles', function(){return $this.hasSubtitles;});
      Player.getter('subtitleText', function(){return $this.subtitleText;});
      Player.getter('subtitles', function(){return $this.subtitles;});
      Player.getter('locales', function(){$this.locales});
      Player.getter('localesArray', function(){
          var ret = [];
          $.each($this.locales, function(i,o){
              ret.push(o);
            });
          return ret;
        });
      Player.getter('subtitleLocale', function(){return $this.subtitleLocale;});
      /* SETTERS */
      Player.setter('subtitleLocale', function(es){
          $this.enableSubtitles = es;
          $this.render();
        });
      Player.setter('subtitleLocale', function(sl){
          if($this.locales[sl]) {
              _loadSubtitleLocale(sl);
              $this.subtitleLocale = sl;
              $this.enableSubtitles = true;
          } else {
              $this.subtitleLocale = '';
              $this.enableSubtitles = false;
              $this.render();
          }
          Player.fire('player:subtitlechange');
        });
      Player.setter('subtitleText', function(st){
          if(typeof(st)!='object') st = [st];
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
          $this.container.removeClass('design-bars').removeClass('design-outline');
          $this.container.addClass('design-' + s.subtitlesDesign||'bars');
          _onByDefault = s.subtitlesOnByDefault||false;
        });
      Player.bind('player:video:progress player:video:timeupdate player:video:seeked', function(e,o){
          $this.possiblyRender();
        });
      Player.bind('player:video:ended', function(e,o){
          Player.set('subtitleText', '');
        });
      $this.possiblyRender = function(){
        if($this.subtitles.length>0) {
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
      }

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
      }

      return $this;
  }
);
