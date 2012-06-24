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

Glue.provide('analytics', 
  {
      timeReportRate:10
  }, 
  function(Glue,$,opts){
      var $this = this;
      $.extend($this, opts);
      delete $this.container;
      
      // Each report should include extra data as context
      var _context = function(o,video){
          o.photo_id = video.id;
          o.type = video.type;
	  o.user_player_type = Glue.get('displayDevice');
	  o.user_player_resolution = screen.width+'x'+screen.height;
	  o.user_player_version = Glue.version;
          return o;
      }
      
      // Bind to events
      Glue.bind('player:videoloaded', function(e,video){                  
          Glue.get('api').analytics.report.event(_context({event:'load'},video));
      });

      var _lastTimeUpdate = 0;
      var _reportTime = 
      Glue.bind('player:video:play player:video:pause player:video:end player:video:timeupdate', function(e,video){
          if(e=='player:video:timeupdate') {
              // Throttle time update reports
              if(((new Date)-_lastTimeUpdate)/1000.0 < $this.timeReportRate)
                  return;
          }
          _lastTimeUpdate = new Date();
          Glue.get('api').analytics.report.play(_context({time_start:Glue.get('startTime'), time_end:Glue.get('currentTime'), time_total:Glue.get('duration')},video));
      });
     
      return $this;
  }
);
