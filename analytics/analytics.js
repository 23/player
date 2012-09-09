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
      var _context = function(o,video){
          o.photo_id = video.id;
          o.type = video.type;
	  o.user_player_type = Player.get('displayDevice');
	  o.user_player_resolution = screen.width+'x'+screen.height;
	  o.user_player_version = Player.version;
          return o;
      }
      
      // Bind to events
      Player.bind('player:videoloaded', function(e,video){                  
          Player.get('api').analytics.report.event(_context({event:'load'},video));
      });

      var _lastTimeUpdate = 0;
      var _reportTime = 
      Player.bind('player:video:play player:video:pause player:video:end player:video:timeupdate', function(e,video){
          if(e=='player:video:timeupdate') {
              // Throttle time update reports
              if(((new Date)-_lastTimeUpdate)/1000.0 < $this.timeReportRate)
                  return;
          }
          _lastTimeUpdate = new Date();
          Player.get('api').analytics.report.play(_context({time_start:Player.get('seekedTime'), time_end:Player.get('currentTime'), time_total:Player.get('duration')},video));
      });
     
      return $this;
  }
);
