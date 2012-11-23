/* 
  CORE PLAYER FOR 23 VIDEO
  This is the guts of the video player, which will load in 
  data and settings from the API and manage events to trigger
  playback and more.

  The module does not display any content on its own and has 
  no template.

  Fires events:
  - player:video:init
  - player:video:populate
  - player:video:loaded
  - player:init
  - player:loaded
  - player:settings

  Answers properties:
  - domain [get/set]
  - video [get/set]
  - settings [get/set]
  - url [get]
  - api [get]
  - clips [get]
  - streams [get]
  - video_title [get]
  - video_content [get]
  - video_photo_id [get/set]
  - video_tree_id [get]
  - video_token [get]
  - video_base_url [get]
  - video_one [get]

*/

// PlayerVideo is an object type for both on-demand clips and live streams.
// Generally, these will be available through Player.get('video'), Player.get('streams')
// and Player.get('clips') -- and can be used using Player.get('clips')[2].switchTo();
var PlayerVideo = function(Player,$,type,data){
    // Set up the object
    var $v = this;
    $v.type = type; // 'clip' or 'stream'
    $v.populated = false;

    // Mix in defaults
    defaults = {
        title:'', 
        content:'', 
        tree_id:'', 
        token:'',
        link:'',
        formats:{},
        width:0,
        height:0,
        aspectRatio:1,
        beforeDownloadType:'',
        beforeDownloadUrl:'',
        beforeLink:'',
        afterDownloadType:'',
        afterDownloadUrl:'',
        afterLink:'',
        afterText:'',
        length:0
    }
    $.extend($v, defaults, data);
    $v.aspectRatio = 1.0*$v.video_medium_width/$v.video_medium_height;
    $v.id = ($v.type=='clip' ? $v.photo_id : $v.livestream_id);

    // Init data model for extra information about the clip 
    // from modules, for example as sections array.
    // (all data needed even when the clip isn't active)
    $v = Player.fire('player:video:init', $v);

    // Populate the clip with extra information 
    // such as subtitles, sections and more,
    // depending on whether modules are activated.
    // (all data needed only when the clip activated)
    $v.populate = function(callback){
        $v = Player.fire('player:video:populate', $v);
        $v.populated = true;
        callback();
    }

    $v.switchTo = function(){
        // The first time the clip is activated, populate it 
        if(!$v.populated) {
            $v.populate($v.switchTo);
            return;
        }
        Player.set('video', $v);
        Player.fire('player:video:loaded', $v);
        Player.set('video', $v);
    }

    return $v;
}

Player.provide('core', 
  {
    domain:'reinvent.23video.com',
    start: 0,
    player_id: 0,

    backgroundColor: 'black',
    trayBackgroundColor: 'black',
    trayTextColor: 'white',
    trayFont: 'Helvetica, Arial, sans-serif',
    trayTitleFontSize: 15,
    trayTitleFontWeight: 'bold',
    trayContentFontSize: 11,
    trayContentFontWeight: 'normal',
    trayAlpha: 0.8,
    showTray: true,
    showBrowse: true,
    browseMode: false,

    verticalPadding: 0,
    horizontalPadding: 0,
    trayTimeout: 0,
    infoTimeout: 5000,
    recommendationHeadline: 'Also have a look at...',
    identityCountdown: false,
    identityAllowClose: true,
    identityCountdownTextSingular: "This advertisement will end in % second",
    identityCountdownTextPlural: "This advertisement will end in % seconds",
    recommendationMethod: 'channel-popular',
    lowBandwidthThresholdKbps: 0,
    maintainIdentityAspectRatio: true,
    enableSubtitles: true,
    subtitlesOnByDefault: false,
    subtitlesDesign: 'bars',
    playlistClickMode:'link',
    enableLiveStreams: true,
    playflowInstreamVideo: '',
    playflowInstreamOverlay: '',
    autoPlay: false,
    loop: false,
    playHD: false
  }, 
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);

      // PROPERTIES
      $this.settings = $.extend(opts, Player.parameters);
      $.each($this.settings, function(i,v){
          if(v=='0') $this.settings[i]=0;
          if(v=='f'||v=='false') $this.settings[i]=false;
          if(v=='1') $this.settings[i]=1;
          if(v=='t'||v=='true') $this.settings[i]=true;
        });
      $this.domain = $this.settings.domain
      $this.url = 'http://' + $this.domain;
      $this.api = new Visualplatform($this.domain);
      $this.video = null;
      $this.streams = [];
      $this.clips = [];

      // METHODS FOR BOOSTRAPPING
      // Load settings for the player from 23 Video
      $this.loadSettings = function(callback){
          $this.api.player.settings(
              {player_id:$this.settings.player_id, params:Player.parametersString},
              function(data){
                  $.extend($this.settings, data.settings);
                  Player.fire('player:settings', $this.settings)
                  callback();
              },
              Player.fail
          );
      }
      // Load on-demand clips
      $this.loadClips = function(callback){
          $this.clips = [];
          $this.api.photo.list(
              $.extend(Player.parameters, {player_id:$this.settings.player_id, size:5, include_related_p:1}),
              function(data){
                  $.each(data.photos, function(i,photo){
                      $this.clips.push(new PlayerVideo(Player,$,'clip',photo));
                  });
                  callback();
              },
              Player.fail
          );
      }
      // Load live streams
      $this.loadStreams = function(callback){
          $this.streams = [];
          $this.api.liveevent.stream.list(
              $.extend(Player.parameters, {player_id:$this.settings.player_id, include_related_p:1}),
              function(data){
                  $.each(data.streams, function(i,stream){
                      $this.streams.push(new PlayerVideo(Player,$,'stream',stream));
                  });
                  callback();
              },
              Player.fail
          );
      }

      /* SETTERS */
      Player.setter('domain', function(d){
          $this.domain = d;
          $this.url = 'http://' + $this.domain;
      });
      Player.setter('video', function(v){
          $this.video = v;
      });
      Player.setter('settings', function(s){
          $this.settings = s;
          Player.fire('player:settings', $this.settings)
      });
      Player.setter('video_photo_id', function(vpi){
          $.each($this.clips, function(i,c){
              if(c.photo_id==vpi) {
                c.switchTo();
                return;
              }
            });
        });
      /* GETTERS */
      Player.getter('domain', function(){return $this.domain;});
      Player.getter('url', function(){return $this.url;});
      Player.getter('api', function(){return $this.api;});
      Player.getter('video', function(){return $this.video;});
      Player.getter('clips', function(){return $this.clips;});
      Player.getter('streams', function(){return $this.streams;});
      Player.getter('settings', function(){return $this.settings;});

      // Information about the current video
      Player.getter('video_title', function(){return $this.video.title||'';});
      Player.getter('video_content', function(){return $this.video.content||'';});
      Player.getter('video_photo_id', function(){return $this.video.photo_id||'';});
      Player.getter('video_duration', function(){return $this.video.video_length||0;});
      Player.getter('video_type', function(){return $this.video.type||'';});
      Player.getter('video_tree_id', function(){return $this.video.tree_id||'';});
      Player.getter('video_token', function(){return $this.video.token||'';});
      Player.getter('video_base_url', function(){return $this.url + '/' + $this.video.tree_id + '/' + $this.video.photo_id + '/' + $this.video.token + '/';});
      Player.getter('video_one', function(){return $this.video.one||'';});
      Player.getter('video_aspect_ratio', function(){return ($this.video.video_medium_width||1) / ($this.video.video_medium_height||1);});

      // Information about frames for the current video
      Player.getter('video_has_frames', function(){try {return ($this.video.video_frames_size>0);} catch(e) {return false;}});
      Player.getter('video_frames_width', function(){return 180;});
      Player.getter('video_frames_height', function(){return 180/Player.get('video_aspect_ratio');});
      Player.getter('video_frames_src', function(){return (Player.get('video_has_frames') ? Player.get('video_base_url') + Player.get('video_frames_width') + 'xfr' : '');});
      Player.getter('video_num_frames', function(){var d = Player.get('video_duration'); return Math.floor(d/Math.ceil(d/200))});

      // Load the player
      $this.bootstrap = function(){
          Player.fire('player:init');
          $this.loadSettings(function(){
              $this.loadClips(function(){
                  $this.loadStreams(function(){
                      $this.loaded = true;
                      Player.fire('player:loaded');
                      if($this.clips.length>0) $this.clips[0].switchTo();
                  });
              });
          });
      }
      $this.bootstrap();

      return $this;
  }
);
