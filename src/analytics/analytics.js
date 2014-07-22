/* 
  MODULE: ANALYTICS
  Report usage data back to 23 Video, including 
  key events and playback information.

  Listens for:
  - player:videoloaded: Log load to 23 Analytics
  - player:video:play: Log play to 23 Analytics
  - player:video:pause: Log playhead to 23 Analytics
  - player:video:end: Log playhead to 23 Analytics
  - player:video:timeupdate: Log playhead to 23 Analytics continuously
  - player:actions:video:click
  - player:actions:video:close
  - player:actions:overlay:click

Answers properties:
  - analyticsEvent [set]
*/

Player.provide('analytics', 
  {
      timeReportRate:10
  }, 
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);
      delete $this.container;

      
      // Each report should include extra data as context
      var _context = function(o){
        $.extend(o,Player.parameters);
        o.type = Player.get('video_type');
        if(o.type=='clip'){
          o.photo_id = Player.get('video_photo_id');
        }else{
          o.photo_id = Player.get('video_live_id');
        }
        o.user_player_type = Player.get('displayDevice');
        o.user_player_resolution = screen.width+'x'+screen.height;
        o.user_player_version = Player.version;
        o.referer = document.referrer;
        o.uuid = Player.get('uuid');
        return o;
      }
      
      // Bind to events for player load
      Player.bind('player:video:loaded', function(e){
          Player.set('analyticsEvent', {event:'load'});
      });

      // Bind to events for playback progress
      var _lastTimeUpdate = 0;
      Player.bind('player:video:play player:video:pause player:video:end player:video:timeupdate', function(e){
          if(e=='player:video:timeupdate') {
              // Throttle time update reports
              if(((new Date)-_lastTimeUpdate)/1000.0 < $this.timeReportRate)
                  return;
          }
          _lastTimeUpdate = new Date();
          if(Player.get('video_type')=='clip'){
            Player.get('api').analytics.report.play(_context({timeStart:Player.get('seekedTime'), timeEnd:Player.get('currentTime'), timeTotal:Player.get('duration')}));
          }else{
            Player.get('api').analytics.report.play(_context({play_timestamp:Player.get("videoElement").getProgramDate()}));
          }
      });

      // Bind to events for PlayFlow/VAST
      Player.bind('player:action:click', function(e, action){
        if(action.type!="video"&&action.type!="ad"){
          Player.set('analyticsEvent', {event:'callToActionClick'});
        }else{
          Player.set('analyticsEvent', {event: action.normalizedStartTime==-1 ? 'preRollClick' : 'postRollClick'});
        }
      });
      // Bind to events for sharing
      Player.bind('player:sharing:embedengaged', function(e){
          Player.set('analyticsEvent', {event:'embedEngaged'});
        });
      Player.bind('player:sharing:shareengaged', function(e){
          Player.set('analyticsEvent', {event:'shareEngaged'});
        });

      // General method to report events
      Player.setter('analyticsEvent', function(e){
          if(typeof(e.event)=='undefined') {
            e = {event:e};
          }
          Player.get('api').analytics.report.event(_context({event:e.event}));
        });


      // Method to set a cookie
      $this.setCookie = function(name, value, daysToExpire) {var expire = ''; if (daysToExpire != undefined) {var d = new Date();d.setTime(d.getTime() + (86400000 * parseFloat(daysToExpire)));expire = '; expires=' + d.toGMTString();} var path = '; path=/'; if (value.length) value=escape(value); else value='""'; return (document.cookie = escape(name) + '=' + value + expire + path);}
      try {$this.setCookie('_visual_swf_referer', document.referrer);}catch(e){}
     
      return $this;
  }
);
