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
      timeReportRate:20,
      analyticsReportServer:'',
      analyticsReportMethod:'individual'
  },
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);
      delete $this.container;

      Player.bind('player:settings', function(e){
        PlayerUtilities.mergeSettings($this, ['timeReportRate', 'analyticsReportServer', 'analyticsReportMethod']);
        // Minimum report rate is 10s
        if($this.timeReportRate<10) $this.timeReportRate = 10;
        // For the fallback case, use individual reporting
        if($this.analyticsReportServer == '') {
          $this.analyticsReportServer = '//' + Player.get('domain')
          $this.analyticsReportMethod = 'individual';
        } 
        if($this.analyticsReportMethod == '' || typeof JSON == 'undefined' || typeof JSON.stringify == 'undefined') {
          $this.analyticsReportMethod = 'individual';
        } 
        // Start sending reports
        _queueSendReports(2+(Math.random()*5));
      });
    
      // Report to analytics
      var _queuedReports = [];
      var _report = function(reportType, data){
        // Queue the report
        data.reportType = reportType;
        data.format = 'json';
        _queuedReports.push(_context(data));
        // If we're reporting individually, do so now
        if($this.analyticsReportMethod=='individual') {
          _sendReports();
        }
      }
      var _sendReports = function(){
        if(_queuedReports.length>0) {
          // Checkout reports
          var _pendingReports = _queuedReports;
          _queuedReports = [];
          if($this.analyticsReportMethod=='batch') {
            // Report every queued report in a batch
            $.ajax({url:$this.analyticsReportServer+'/api/analytics/report/batch', timeout:1000, dataType:'jsonp', jsonpCallback:'window.ignore', data:{data:JSON.stringify(_pendingReports)}, crossDomain:true});
          } else {
            // Report individually and with no queued failover
            $.each(_pendingReports, function(i,data){
              $.ajax({url:$this.analyticsReportServer+'/api/analytics/report/'+data.reportType, data:data, timeout:1000, dataType:'jsonp', jsonpCallback:'window.ignore', crossDomain:true});
            });
          }
        }
        if($this.analyticsReportMethod=='batch') _queueSendReports();
      }
      var _queueSendReports = function(delay){
        window.setTimeout(_sendReports, (delay||$this.timeReportRate)*1000);
      }
    
    
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
      var _lastTimeReport = -1;
      Player.bind('player:video:play player:video:pause player:video:ended player:video:timeupdate', function(e){
          if(e=='player:video:timeupdate') {
              // Throttle time update reports
              if(((new Date)-_lastTimeUpdate)/1000.0 < $this.timeReportRate)
                  return;
          }
          _lastTimeUpdate = new Date();
          if(Player.get('video_type')=='clip'){
            var currentTime = Player.get('currentTime');
            var duration = Player.get('duration');
            if(
                !isNaN(duration)  && duration>0
                &&
                !isNaN(currentTime) 
                &&
                (_lastTimeReport<0 || Math.abs(currentTime-_lastTimeReport)>1)
            ) {
              _report('play', {timeStart:Player.get('seekedTime'), timeEnd:currentTime, timeTotal:Player.get('duration')});
              _lastTimeReport = currentTime;
            }
            // When a video stops playing, flush the report queue explicitly
            if(e=='player:video:ended') _sendReports();
          }else{
            var timestamp = parseInt(Player.get("videoElement").getProgramDate()/1000, 10);
            if(!isNaN(timestamp) && Player.get('playing')) {
              _report('play', {play_timestamp:timestamp});
            }
          }
      });

      // Bind to events for PlayFlow/VAST
      Player.bind('player:action:click', function(e, action){
        if(action.type!="video"&&action.type!="ad"){
          Player.set('analyticsEvent', {event:'callToActionClick'});
        }else{
          Player.set('analyticsEvent', {event: action.normalizedStartTime==-1 ? 'preRollClick' : 'postRollClick'});
        }
        // Flush the report queue explicitly
        _sendReports();
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
          if(Player.get('video_type')!='clip') return;
          if(typeof(e.event)=='undefined') {
            e = {event:e};
          }
          _report('event', {event:e.event});
        });


      // Method to set a cookie
      $this.setCookie = function(name, value, daysToExpire) {var expire = ''; if (daysToExpire != undefined) {var d = new Date();d.setTime(d.getTime() + (86400000 * parseFloat(daysToExpire)));expire = '; expires=' + d.toGMTString();} var path = '; path=/'; if (value.length) value=escape(value); else value='""'; return (document.cookie = escape(name) + '=' + value + expire + path);}
      try {$this.setCookie('_visual_swf_referer', document.referrer);}catch(e){}
     
      return $this;
  }
);

window.ignore = function(){};