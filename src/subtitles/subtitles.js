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
   - locales [get/set]
   - localesArray [get]
   - subtitleLocale [get/set]
   - supportsAudioDescriptions [get]
   - hasAudioDescriptions [get]
   - audioDescriptionTracks [get/set]
   - audioDescriptionTracksArray [get]
   - audioDescriptionLocale [get/set]
   - audioDescriptionLocaleMessages [get]
 */

Player.provide('subtitles',
  {
    enableSubtitles: true,
    subtitlesOnByDefault: false,
    includeDraftSubtitles: false,
    defaultLocale: '',
    defaultAudioDescripionLocale: '',
    subtitlesDesign: 'bars'
  },
  function (Player, $, opts) {
    var $this = this;
    $.extend($this, opts);
    var forceReloadSubtitles = false;

    // Properties
    $this.subtitleStreamType = 'video';
    var _reset = function () {
      $this.locales = {};
      $this.subtitleLocale = '';
      $this.subtitles = [];
      $this.subtitleText = '';
      $this.hasSubtitles = false;

      // Make audio descriptions available through the same load procedures
      $this.supportsAudioDescriptions = window.speechSynthesis && true;;
      $this.hasAudioDescriptions = false;
      $this.audioDescriptionTracks = {};
      $this.audioDescriptionLocale = '';
      $this.audioDescriptionLocaleMessages = [];

      Player.set('subtitles', '');
      Player.fire('player:subtitlechange');
    };

    /* GETTERS */
    Player.getter('enableSubtitles', function () { return $this.enableSubtitles; });
    Player.getter('hasSubtitles', function () { return $this.hasSubtitles; });
    Player.getter('subtitleText', function () { return $this.subtitleText; });
    Player.getter('subtitles', function () { return $this.subtitles; });
    Player.getter('locales', function () { return $this.locales; });
    Player.getter('localesArray', function () {
      var ret = [];
      $.each($this.locales, function (i, o) {
        ret.push(o);
      });
      return ret;
    });
    Player.getter('subtitleLocale', function () { return $this.subtitleLocale; });
    Player.getter('subtitleDirection', function () {
      try {
        return Player.get('locales')[Player.get('subtitleLocale')].direction || 'ltr';
      } catch (e) {
        return 'ltr';
      }
    });
    Player.getter('supportsAudioDescriptions', function () { return $this.supportsAudioDescriptions; });
    Player.getter('hasAudioDescriptions', function () { return $this.supportsAudioDescriptions && $this.hasAudioDescriptions; });
    Player.getter('audioDescriptionTracks', function () { return $this.audioDescriptionTracks; });
    Player.getter('audioDescriptionTracksArray', function () {
      var ret = [];
      $.each($this.audioDescriptionTracks, function (i, o) {
        ret.push(o);
      });
      return ret;
    });
    Player.getter('audioDescriptionLocale', function () { return $this.audioDescriptionLocale; });
    Player.getter('audioDescriptionLocaleMessages', function () { return $this.audioDescriptionLocaleMessages; });

    /* SETTERS */
    Player.setter('enableSubtitles', function (es) {
      $this.enableSubtitles = es;
      $this.render();
      Player.fire('player:subtitlechange');
    });
    Player.setter('locales', function (l) {
      $this.locales = l;
      $this.hasSubtitles = Object.keys($this.locales).length > 0;
      Player.fire('player:subtitlechange');
    });
    Player.setter('audioDescriptionTracks', function (adt) {
      $this.audioDescriptionTracks = adt;
      $this.hasAudioDescriptions = Object.keys($this.audioDescriptionTracks).length > 0;
      Player.fire("player:audiodescriptionchanged");
    });
    Player.setter('subtitleLocale', function (sl) {
      if ($this.locales[sl]) {
        Player.set('subtitles', '');
        if($this.subtitleStreamType=='video') {
          loadVideoTrackFromApi(sl, 'general', function (subtitles) {
            Player.set('subtitles', subtitles);
          });
        }
        $this.subtitleLocale = sl;
        $this.enableSubtitles = !Player.get('showNativeVideoControls');
        Player.fire("player:subtitlesactivated");
      } else {
        $this.subtitleLocale = '';
        $this.subtitles = [];
        $this.render();
      }
      Player.fire('player:subtitlechange');
    });
    Player.setter('subtitleText', function (st) {
      if (typeof (st) != 'object') st = (st == '' ? [] : [st]);
      if ($this.subtitleText != st) {
        $this.subtitleText = st;
        $this.render();
      }
    });
    Player.setter('subtitles', function (s) {
      $this.subtitles = s;
      Player.fire('player:subtitlechange');
      $this.possiblyRender();
    });
    Player.setter('audioDescriptionLocale', function (adl) {
      if (!$this.supportsAudioDescriptions) {
        $this.audioDescriptionLocale = '';
        return;
      }

      if (!$this.audioDescriptionTracks[adl]) adl = '';
      $this.audioDescriptionLocale = adl;
      Player.fire("player:audiodescriptionchanged");

      // Load messages
      $this.audioDescriptionLocaleMessages = [];
      if ($this.audioDescriptionLocale != '') {
        loadVideoTrackFromApi($this.audioDescriptionLocale, 'audiodescriptions', function (data) {
          var messages = [];
          for (var i = 0; i < data.length; i++) {
            var text = data[i].text.join('\n');
            var utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = $this.audioDescriptionLocale.replace(/_/, '-');
            utterance.pitch = 1.0;
            utterance.rate = 1.2;
            messages.push({ start: data[i].timestamp_begin, end: data[i].timestamp_end, queued: false, utterance: utterance, text: text });
          }
          $this.audioDescriptionLocaleMessages = messages;
          Player.fire("player:audiodescriptionsupdated");
        });
      }
    });

    if (window.speechSynthesis && true) {
      var speech = window.speechSynthesis;
      var queueSpeech = function () {
        if (!Player.get('playing')) return;
        var ct = Player.get('currentTime');
        var messages = $this.audioDescriptionLocaleMessages;
        for (var i = 0; i < messages.length; i++) {
          if (messages[i].queued) continue;
          if (messages[i].start <= ct && ct <= messages[i].end) {
            speech.speak(messages[i].utterance);
            messages[i].queued = true;
          }
        }
      };
      var cancelSpeechQueue = function () {
        // Cancel speaking
        speech.cancel();
        // Reset status on messages
        var messages = $this.audioDescriptionLocaleMessages;
        for (var i = 0; i < messages.length; i++) messages[i].queued = false;
      };


      Player.bind('player:audiodescriptionsupdated player:audiodescriptionchanged player:video:seeked', cancelSpeechQueue);
      Player.bind('player:video:timeupdate', queueSpeech);
      Player.bind('player:video:pause', function () {
        speech.pause();
      });
      Player.bind('player:video:play', function () {
        speech.resume();
      });
    }

    // Listen to events
    Player.bind('player:subtitlechange', function () {
      $this.container.css({ direction: Player.get('subtitleDirection') });
    });

    // Subtitle rendering
    // Listens to events and rerenders accordingly
    Player.bind('player:settings', function (e, s) {
      PlayerUtilities.mergeSettings($this, ['enableSubtitles', 'subtitlesOnByDefault', 'subtitlesDesign', 'includeDraftSubtitles', 'defaultLocale', 'defaultAudioDescripionLocale']);
      $this.container.removeClass('design-bars').removeClass('design-outline');
      $this.container.addClass('design-' + $this.subtitlesDesign || 'bars');
      Player.fire('player:subtitlechange');
    });
    Player.bind('player:video:play play:video:playing player:video:pause player:video:progress player:video:timeupdate player:video:seeked', function (e, o) {
      $this.possiblyRender();
    });
    Player.bind('player:video:ended', function (e, o) {
      Player.set('subtitleText', '');
    });
    $this.possiblyRender = function () {
      var time = 0
      if($this.subtitleStreamType=='video') {
        time = Player.get('currentTime');
      } else {
        var ve = Player.get('videoElement')
        if(ve) {
          if (ve.hls && ve.hls.playingDate) {
            time = (Player.get('videoElement').hls.playingDate)*1.0
          } else {
            var v = ve.video[0]
            if (v.getStartDate) {
              time = (v.getStartDate()*1) + (v.currentTime*1000)
            }
          }
        }
      }
      if (time > 0 && $this.subtitles.length > 0) {
        var text = '';
        $.each($this.subtitles, function (i, s) {
          if (time >= s.timestamp_begin && time < s.timestamp_end) {
            text = s.text;
          }
        });
        Player.set('subtitleText', text);
      } else {
        Player.set('subtitleText', '');
      }
    };
    $this.possiblyInsertSubtitleTracks = function () {
      if (/iPhone|iPad/.test(navigator.userAgent)) {
        var ve = Player.get("videoElement");
        var v;
        if (typeof (ve) != "undefined") {
          v = $(ve.video[0]);
        } else {
          return;
        }
        v.find("track").remove();
        if($this.subtitleStreamType=='video') {
          $.each($this.locales, function (i, o) {
            var track = $("<track>");
            track.attr("kind", "subtitles");
            track.attr("src", o.href.replace(/\.srt|\.websrt/, ".vtt"));
            track.attr("srclang", o.locale.replace(/_/, '-'));
            track.attr("label", (/^([^\(]+)\(/.test(o.language) ? o.language.match(/^([^\(]+)\(/)[1] : o.language));
            track.prop("mode", "disabled");
            v.append(track);
          });
          $this.bindFullscreenListeners(v);
        }
      }
    };
    Player.bind("player:video:loadedmetadata", function () {
      if ($this.pendingSubtitleTracks) {
        $this.possiblyInsertSubtitleTracks();
        $this.pendingSubtitleTracks = false;
      }
    });
    $this.fullscreenListenersBound = false;
    $this.bindFullscreenListeners = function (v) {
      if (/iPad|iPhone/.test(navigator.userAgent) && !$this.fullscreenListenersBound) {
        var ve = v.get(0);
        // Possibly show track elements when we enter fullscreen
        ve.addEventListener('webkitbeginfullscreen', function () {
          for (var i = 0; i < ve.textTracks.length; i += 1) {
            if (
              ve.textTracks[i].language.substr(0, 2) == Player.get("subtitleLocale").substr(0, 2)
              ||
              ve.textTracks[i].language == Player.get("subtitleLocale").replace(/_/, '-')
            ) {
              ve.textTracks[i].mode = "showing";
            } else {
              ve.textTracks[i].mode = "disabled";
            }
          }
        }, false);
        // Disable native track elements when we leave fullscreen
        // and mirror showing/disabled subtitles in the subtitles module
        ve.addEventListener('webkitendfullscreen', function () {
          var _showingSubtitlesFound = false;
          for (var i = 0; i < ve.textTracks.length; i += 1) {
            if (ve.textTracks[i].mode == "showing") {
              $.each($this.locales, function (a, o) {
                if (ve.textTracks[i].language == o.locale.substr(0, 2)) {
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

    // Load some list of available video subtitles from /api/photo/subtitle/list
    var loadVideoSubtitlesFromApi = function () {
      var v = Player.get('video');
      var includeDraftSubtitles = ($this.includeDraftSubtitles ? 1 : 0)
      if (includeDraftSubtitles) forceReloadSubtitles = true;
      if ((typeof (v.subtitles_p) != 'undefined' && v.subtitles_p) || includeDraftSubtitles) {
        var query = { photo_id: Player.get('video_photo_id'), token: Player.get('video_token'), include_drafts_p: includeDraftSubtitles };
        if (forceReloadSubtitles) {
          query['cache_bust'] = Math.random()
        }
        Player.get('api').photo.subtitle.list(
          query,
          function (data) {
            // Load a list of languages to support
            var locales = {}
            var audioDescriptionTracks = {}
            $.each(data.subtitles, function (i, o) {
              if (o.type != 'audiodescriptions') {
                if (o.default_p && !o.draft_p && $this.defaultLocale == '') {
                  $this.defaultLocale = o.locale;
                }
                locales[o.locale] = o;
              } else {
                audioDescriptionTracks[o.locale] = o;
              }
            });
            Player.set('locales', locales);
            Player.set('subtitleLocale', (!!$this.defaultLocale && !!$this.subtitlesOnByDefault ? $this.defaultLocale : ''));
            Player.set('audioDescriptionTracks', audioDescriptionTracks);
            Player.set('audioDescriptionLocale', $this.defaultAudioDescripionLocale);
            $this.pendingSubtitleTracks = true;
            Player.fire('player:subtitlechange');
            Player.fire("player:audiodescriptionchanged");
          },
          Player.fail
        );
      }
    }
    var localVideoTrackCache = {};
    var loadVideoTrackFromApi = function (locale, type, callback) {
      var key = [Player.get('video_photo_id'), locale, type].join(':');
      if (localVideoTrackCache[key]) {
        callback(localVideoTrackCache[key], locale, type);
      } else {
        var query = { photo_id: Player.get('video_photo_id'), token: Player.get('video_token'), locale: locale, type: type, subtitle_format: 'json' }
        if (forceReloadSubtitles) {
          query['cache_bust'] = Math.random()
        }
        Player.get('api').photo.subtitle.data(
          query,
          function (data) {
            var s = $.parseJSON(data.data.json);
            localVideoTrackCache[key] = s.subtitles;
            callback(s.subtitles, locale, type);
          },
          Player.fail
        );
      }
    }

    // Load locales for live
    var loadLiveSubtitlesFromApi = function () {
      var v = Player.get('video');
      // Empty by default
      Player.set('locales', {});
      Player.set('subtitleLocale', (!!$this.defaultLocale && !!$this.subtitlesOnByDefault ? $this.defaultLocale : ''));
      Player.set('audioDescriptionTracks', {});
      Player.set('audioDescriptionLocale', $this.defaultAudioDescripionLocale);
      // Load locales
      Player.get('api').live.transcription.locales(
        {live_id:v.live_id, token:v.token},
        function (data) {
          var locales = {}
          $.each(data.livelocales, function (i, o) {
            if (o.default_p) {
              $this.defaultLocale = o.locale;
            }
            o.type = 'live';
            locales[o.locale] = o;
          });
          Player.set('subtitleLocale', (!!$this.defaultLocale && !!$this.subtitlesOnByDefault ? $this.defaultLocale : ''));
          Player.set('locales', locales);
          //$this.pendingSubtitleTracks = true;
        },
        Player.fail
      );
    }
    var liveSubtitleRefreshInterval = null;
    Player.bind('player:subtitlechange', function(){
      if($this.subtitleStreamType!='live' || Player.get('subtitleLocale').length==0) {
        if(liveSubtitleRefreshInterval) {
          window.clearInterval(liveSubtitleRefreshInterval)
          liveSubtitleRefreshInterval = null;
        }
      } else {
        if(!liveSubtitleRefreshInterval) {
          v = Player.get('video')
          liveSubtitleRefreshInterval = window.setInterval(function(){
            var subtitles = []
            Player.get('api').live.transcription.list(
              {live_id:v.live_id, token:v.token, recent_p:1, locale:Player.get('subtitleLocale')},
              function(data){
                $.each(data.livetranscriptions, function(i,t) {
                  subtitles.push({
                    text:[t.text],
                    timestamp_begin:parseFloat(t.start_time)*1000,
                    timestamp_end:parseFloat(t.end_time)*1000
                  });
                });
                $this.subtitles = subtitles;
              },
              Player.fail
            )
          }, 1000)
        }
      }
    });

    var resetAndLoadSubtitles = function(){
      _reset();
      if($this.subtitleStreamType=='live'){
        loadLiveSubtitlesFromApi(false);
      } else {
        loadVideoSubtitlesFromApi(false);
      }
    }
    Player.bind('player:video:loaded', function (e,v) {
      $this.subtitleStreamType = (v.type=='stream' ? 'live' : 'video');
      resetAndLoadSubtitles();
    });
    Player.setter('reloadSubtitles', function () {
      forceReloadSubtitles = true;
      // clear cache
      localVideoTrackCache = {};

      var locale = Player.get('subtitleLocale');
      if (locale) {
        $this.defaultLocale = locale;
      }
      if ($this.audioDescriptionLocale != '') {
        $this.defaultAudioDescripionLocale = $this.audioDescriptionLocale;
      }
      resetAndLoadSubtitles();
    });


    // Bootstrap and load
    _reset();
    return $this;
  }
);
