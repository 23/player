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
  - player_id [get]
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
  - video_album_id [get]
  - video_one [get]
  - open_photo_id [set]
*/

// PlayerVideo is an object type for both on-demand clips and live streams.
// Generally, these will be available through Player.get('video'), Player.get('streams')
// and Player.get('clips') -- and can be used using Player.get('clips')[2].switchTo();
var PlayerVideo = function(Player,$,type,data){
    // Set up the object
    var $v = this;

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
        length:0
    }
    $.extend($v, defaults, data);
    $v.type = type; // 'clip' or 'stream'
    $v.populated = false;
    $v.id = ($v.type=='clip' ? $v.photo_id : $v.live_id);

    // Someone smartly gave different variable names to streams
    if($v.type=='stream') {
      $v.title = $v.name
      $v.content = $v.description_html;
    }

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
    domain:'',
    player_id: 0
  },
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);

      $this.protocol = (/^https/.test(location.href) ? 'https' : 'http');

      // PROPERTIES
      $this.settings = $.extend(opts, Player.parameters);
      $.each($this.settings, function(i,v){
          if(v=='0') $this.settings[i]=0;
          if(v=='f'||v=='false') $this.settings[i]=false;
          if(v=='1') $this.settings[i]=1;
          if(v=='t'||v=='true') $this.settings[i]=true;
        });

      // Build domain
      if($this.domain=='') $this.domain = $this.settings.domain||document.domain;
      if($this.domain=='localhost' || $this.domain=='127.0.0.1' || $this.domain.match(/^10\./) || $this.domain.match(/^192\.168\./) || $this.domain.match(/^172\.1[6-9]\./)) $this.domain = 'reference.dev.visualtube.net';
      // Build player_id if we're loadin for examaple 1234.ithml
      if($this.settings.player_id==0) {
          var p=location.pathname.match(/\/([0-9]+)\.i?html/);
          if(p) $this.settings.player_id = p[1];
      }
      $this.url = $this.protocol + '://' + $this.domain;
      $this.api = new Visualplatform($this.domain);
      $this.api.protocol = $this.protocol;
      $this.video = null;
      $this.streams = [];
      $this.clips = [];

      // METHODS FOR BOOSTRAPPING
      $this.load = function(callback){
          var methods = [];

          // Load settings for the player from 23 Video
          methods.push({
              method:'/api/player/settings',
              data:{player_id:$this.settings.player_id, parameters:Player.parametersString},
              callback: function(data){
                  if(data.status=='ok') {
                      // Merge in settings API, then from player parameter
                      $.extend($this.settings, data.settings);
                      $this.settings = $.extend(opts, Player.parameters);
                      // Normalize numbers and bools
                      $.each($this.settings, function(i,v){
                          if(v=='f'||v=='false') $this.settings[i]=false;
                          if(v=='t'||v=='true') $this.settings[i]=true;
                          if(!isNaN(v)) $this.settings[i]=new Number(v)+0;
                      });
                      Player.fire('player:settings', $this.settings)
                  }
              }
          });

          // Load live streams
          $this.streams = [];
          methods.push({
              method:'/api/live/list',
              data:$.extend(Player.parameters, {upcoming_p:1, ordering:'streaming', player_id:$this.settings.player_id}),
              callback: function(data){
                  if(data.status=='ok') {
                      $.each(data.live, function(i,stream){
                          $this.streams.push(new PlayerVideo(Player,$,'stream',stream));
                      });
                  }
              }
          });

          // Load on-demand clips
          $this.clips = [];
          methods.push({
              method:'/api/photo/list',
              data:$.extend({size:10}, Player.parameters, {player_id:$this.settings.player_id}),
              callback: function(data){
                  if(data.status=='ok') {
                      $.each(data.photos, function(i,photo){
                          $this.clips.push(new PlayerVideo(Player,$,'clip',photo));
                      });
                  }
              }
          });

          // Call the API
          $this.api.concatenate(methods, callback, function(){});
      }


      /* SETTERS */
      Player.setter('domain', function(d){
          $this.domain = d;
          $this.url = $this.protocal + '://' + $this.domain;
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
      Player.setter('open_photo_id', function(opi){
          $.each($this.clips, function(i,c){
              if(c.photo_id==opi) {
                Player.set('playing', false);
                window.open(Player.get('url') + c.one);
                return;
              }
            });
        });
      Player.setter('video_live_id', function(vli){
          $.each($this.streams, function(i,s){
              if(s.live_id==vli) {
                s.switchTo();
                return;
              }
            });
        });
      Player.setter('open_live_id', function(oli){
          $.each($this.streams, function(i,s){
              if(s.live_id==oli) {
                Player.set('playing', false);
                window.open(Player.get('url') + s.link);
                return;
              }
            });
        });

      /* GETTERS */
      Player.getter('player_id', function(){return $this.settings.player_id;});
      Player.getter('domain', function(){return $this.domain;});
      Player.getter('url', function(){return $this.url;});
      Player.getter('protocol', function(){return $this.protocol;});
      Player.getter('api', function(){return $this.api;});
      Player.getter('video', function(){return $this.video;});
      Player.getter('clips', function(){return $this.clips;});
      Player.getter('streams', function(){return $this.streams;});
      Player.getter('settings', function(){return $this.settings;});

      // Information about the current video
      Player.getter('video_title', function(){return ($this.video ? $this.video.title||'' : '');});
      Player.getter('video_content', function(){return ($this.video ? $this.video.content||'' : '');});
      Player.getter('video_photo_id', function(){return ($this.video ? $this.video.photo_id||'' : '');});
      Player.getter('video_live_id', function(){return ($this.video ? $this.video.live_id||'' : '');});
      Player.getter('video_duration', function(){return ($this.video ? $this.video.video_length||'' : '');});
      Player.getter('video_type', function(){return ($this.video ? $this.video.type||'' : '');});
      Player.getter('video_tree_id', function(){return ($this.video ? $this.video.tree_id||'' : '');});
      Player.getter('video_token', function(){return ($this.video ? $this.video.token||'' : '');});
      Player.getter('video_album_id', function(){return ($this.video ? $this.video.album_id||'' : '');});
      Player.getter('video_one', function(){
        if(!$this.video) return '';
        return ($this.video.type=='clip' ? $this.video.one||'' : $this.video.link||'');
      });
      Player.getter('video_base_url', function(){
        if(!$this.video) return $this.url;
        if($this.video.type=='clip') {
          return $this.url + '/' + $this.video.tree_id + '/' + $this.video.photo_id + '/' + $this.video.token + '/';
        } else {
          return $this.url + '/' + $this.video.link;
        }
      });
      Player.getter('video_aspect_ratio', function(){return ($this.video.video_medium_width||1) / ($this.video.video_medium_height||1);});
      Player.getter('video_sharable', function(){
        try {
          return ($this.video && $this.video.album_id.length>0 && $this.video.published_p && !$this.video.album_hide_p);
        }catch(e){
          return false;
        }
      });

      // Information about frames for the current video
      Player.getter('video_has_frames', function(){try {return ($this.video.video_frames_size>0);} catch(e) {return false;}});
      Player.getter('video_frames_width', function(){return 180;});
      Player.getter('video_frames_height', function(){return 180/(Player.get('video').video_frames_width/Player.get('video').video_frames_height);});
      Player.getter('video_frames_src', function(){return (Player.get('video_has_frames') ? Player.get('video_base_url') + Player.get('video_frames_width') + 'xfr' : '');});
      Player.getter('video_num_frames', function(){var d = Player.get('video_duration'); return Math.ceil(d/Math.ceil(d/200)) + 1;});

      // Different sizes of players (this is used by non-design modules such as subtitles, thus placed here.)
      $this.playerSize = 'medium';
      $this.handleSize = function(){
          var b = $('body')
          var w = $(window).width();
          if(w<300) $this.playerSize = 'tiny';
          else if(w<450) $this.playerSize = 'small';
          else if(w<700) $this.playerSize = 'medium';
          else if(w<900) $this.playerSize = 'large';
          else $this.playerSize = 'full';
          b.removeClass('size-tiny size-small size-medium size-large size-full');
          b.addClass('size-'+$this.playerSize);
      }
      $this.handleSize();
      $(window).resize($this.handleSize);
      Player.getter('playerSize', function(){return $this.playerSize;});


      // Load the player
      $this.bootstrap = function(){
          Player.fire('player:init');
          $this.load(function(){
              $this.loaded = true;
              Player.fire('player:loaded');

              var currentlyStreaming = false;
              $.each($this.streams, function(i,s){
                if(s.streaming_p) currentlyStreaming = true;
              });
            
              var loadStreamsByDefault =
                typeof(Player.parameters.live_id)!='undefined'
                ||
                (typeof(Player.parameters.photo_id)=='undefined'&&typeof(Player.parameters.album_id)=='undefined'&&typeof(Player.parameters.tag)=='undefined');
              if(loadStreamsByDefault&&$this.streams.length>0&&currentlyStreaming) {
                  $this.streams[0].switchTo(); // live stream is possible
              } else if($this.clips.length>0) {
                  $this.clips[0].switchTo(); // otherwise show the clip
              } else {
                  Player.set('error', "No video to play. Make sure you're logged in and that the player is configured correctly.");
              }
          });
      }
      $this.bootstrap();

      return $this;
  }
);

// Global utility methods
var PlayerUtilities = {
  mergeSettings: function(obj,settings){
    var s = Player.get('settings');
    $.each(settings, function(i,setting){
        if (typeof(s[setting])!='undefined' && s[setting].length!=='') {
          obj[setting] = s[setting];
        }
      });
  }
}

// Cookie object
var Cookie = {
    set: function(name, value, daysToExpire) {var expire = ''; if (daysToExpire != undefined) {var d = new Date();d.setTime(d.getTime() + (86400000 * parseFloat(daysToExpire)));expire = '; expires=' + d.toGMTString();} var path = '; path=/'; if (value.length) value=escape(value); else value='""'; return (document.cookie = escape(name) + '=' + value + expire + path);},
    get: function(name) {var cookie = document.cookie.match(new RegExp('(^|;)\\s*' + escape(name) + '=([^;\\s]*)')); return (cookie ? unescape(cookie[2]) : '');},
    erase: function(name) {var cookie = Cookie.get(name) || true; Cookie.set(name, '', -1); return cookie;},
    accept: function() {if (typeof(navigator.cookieEnabled)=='boolean') {return navigator.cookieEnabled;} Cookie.set('_test', '1'); return (Cookie.erase('_test')=='1');}
};
