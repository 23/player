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
  - player:playflow:video:click
  - player:playflow:video:close
  - player:playflow:overlay:click

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
        o.photo_id = Player.get('video_photo_id');
        o.type = Player.get('video_type');
        o.user_player_type = Player.get('displayDevice');
        o.user_player_resolution = screen.width+'x'+screen.height;
        o.user_player_version = Player.version;
        return o;
      }
      
      // Bind to events for player load
      Player.bind('player:video:loaded', function(e){
          Player.set('analyticsEvent', {event:'load'});
      });

      // Bind to events for playback progress
      var _lastTimeUpdate = 0;
      var _reportTime = 
      Player.bind('player:video:play player:video:pause player:video:end player:video:timeupdate', function(e){
          if(e=='player:video:timeupdate') {
              // Throttle time update reports
              if(((new Date)-_lastTimeUpdate)/1000.0 < $this.timeReportRate)
                  return;
          }
          _lastTimeUpdate = new Date();
          Player.get('api').analytics.report.play(_context({timeStart:Player.get('seekedTime'), timeEnd:Player.get('currentTime'), timeTotal:Player.get('duration')}));
      });

      // Bind to events for PlayFlow/VAST
      Player.bind('player:overlay:click', function(e){
          Player.set('analyticsEvent', {event:'callToActionClick'});
        });
      Player.bind('player:playflow:video:click', function(e){
          Player.set('analyticsEvent', {event: Player.get('playflowAdPosition')=='preroll' ? 'preRollClick' : 'postRollClick'});
        });
      Player.bind('player:playflow:video:close', function(e){
          Player.set('analyticsEvent', {event: Player.get('playflowAdPosition')=='preroll' ? 'preRollClose' : 'postRollClose'});
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

     
      return $this;
  }
);
