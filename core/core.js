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

  Answers properties:
  - domain [get/set]
  - video [get/set]
  - settings [get/set]
  - url [get]
  - api [get]
  - clips [get]
  - streams [get]
*/

// PlayerVideo is an object type for both on-demand clips and live streams.
// Generally, these will be available through Glue.get('video'), Glue.get('streams')
// and Glue.get('clips') -- and can be used using Glue.get('clips')[2].switchTo();
var PlayerVideo = function(Glue,$,type,data){
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
    $v = Glue.fire('player:video:init', $v);

    // Populate the clip with extra information 
    // such as subtitles, sections and more,
    // depending on whether modules are activated.
    // (all data needed only when the clip activated)
    $v.populate = function(callback){
        $v = Glue.fire('player:video:populate', $v);
        $v.populated = true;
        callback();
    }

    $v.switchTo = function(){
        // The first time the clip is activated, populate it 
        if(!$v.populated) {
            $v.populate($v.switchTo);
            return;
        }
        Glue.set('video', $v);
        Glue.fire('player:video:loaded', $v);
        Glue.set('video', $v);
    }

    return $v;
}

Glue.provide('core', 
  {
    domain:'reinvent.23video.com',
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
    showDescriptions: false,
    logoSource: '',
    showBigPlay: false,
    showLogo: true,
    showShare: true,
    showBrowse: true,
    browseMode: false,
    logoPosition: 'top right',
    logoAlpha: 0.7,
    logoWidth: 80,
    logoHeight: 40,
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
    start: 0,
    player_id: 0,
    rssLink: '',
    podcastLink: '',
    embedCode: '',
    currentVideoEmbedCode: '',
    socialSharing: true,
    autoPlay: false,
    loop: false,
    playHD: false
  }, 
  function(Glue,$,opts){
      var $this = this;

      // PROPERTIES
      $this.settings = opts;
      $this.domain = $this.settings.domain
      $this.url = 'http://' + $this.domain;
      $this.api = Visualplatform($this.domain);
      $this.video = null;
      $this.streams = [];
      $this.clips = [];

      // METHODS FOR BOOSTRAPPING
      // Load settings for the player from 23 Video
      $this.loadSettings = function(callback){
          $this.api.player.settings(
              {player_id:$this.player_id, params:Glue.parametersString},
              function(data){
                  $.extend($this.settings, data.settings);
                  callback();
              },
              Glue.fail
          );
      }
      // Load on-demand clips
      $this.loadClips = function(callback){
          $this.clips = [];
          $this.api.photo.list(
              $.extend(Glue.parameters, {include_related_p:1}),
              function(data){
                  $.each(data.photos, function(i,photo){
                      $this.clips.push(new PlayerVideo(Glue,$,'clip',photo));
                  });
                  callback();
              },
              Glue.fail
          );
      }
      // Load live streams
      $this.loadStreams = function(callback){
          $this.streams = [];
          $this.api.liveevent.stream.list(
              $.extend(Glue.parameters, {include_related_p:1}),
              function(data){
                  $.each(data.streams, function(i,stream){
                      $this.streams.push(new PlayerVideo(Glue,$,'stream',stream));
                  });
                  callback();
              },
              Glue.fail
          );
      }

      /* SETTERS */
      Glue.setter('domain', function(d){
          $this.domain = d;
          $this.url = 'http://' + $this.domain;
      });
      Glue.setter('video', function(v){
          $this.video = v;
      });
      Glue.setter('settings', function(s){
          $this.settings = s;
      });

      /* GETTERS */
      Glue.getter('domain', function(){return $this.domain;});
      Glue.getter('url', function(){return $this.url;});
      Glue.getter('api', function(){return $this.api;});
      Glue.getter('video', function(){return $this.video;});
      Glue.getter('clips', function(){return $this.clips;});
      Glue.getter('streams', function(){return $this.streams;});
      Glue.getter('settings', function(){return $this.settings;});

      // Load the player
      $this.bootstrap = function(){
          Glue.fire('player:init');
          $this.loadSettings(function(){
              $this.loadClips(function(){
                  $this.loadStreams(function(){
                      $this.loaded = true;
                      Glue.fire('player:loaded');
                      if($this.clips.length>0) $this.clips[0].switchTo();
                  });
              });
          });
      }
      $this.bootstrap();

      return $this;
  }
);
