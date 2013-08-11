/* 
   MODULE: LIVE PREVIEW
   A module with status and countdown to live streams with preview thumbnails.
   
   Listens for:
   - player:video:loaded
   - player:video:play
   - player:video:pause
   
   Answers properties:
   - showLivePreview [get]
   - showLiveCountdown [get]
   - nextStartTime [get]
*/

Player.provide('live-preview', 
  {},
  function(Player,$,opts){  
      var $this = this;
      $.extend($this, opts);
      $this.showAnimation = [{opacity:'show'}, 400];

      $this.nextStartTime = '';
      $this.showLivePreview = false;
      $this.showLiveCountdown = false;
    
      var onRender = function(){
        $this.container.find('.preview-thumbnail').css({backgroundImage:'url(' + Player.get('url') + Player.get('video').preview_large_download + ')'});
        updateCountdown();
      }
      var updateCountdown = function(){
        $this.container.find('.preview-countdown span').html(formatCountdown($this.nextStartTime));
      }
      window.setInterval(updateCountdown, 500);
      var formatCountdown = function(d){
        if(d=='') return('');
        var seconds = Math.max((d-(new Date))/1000,0);
        var ret = [];
        $.each([
          ['month','months', 60*60*24*30],
          ['week','weeks', 60*60*24*7],
          ['day','days', 60*60*24],
          ['hour','hours', 60*60],
          ['minutes','minutes', 60],
          ['second', 'seconds', 1]
        ], function(i,x){
          var num = Math.floor(seconds/x[2]);
          if(num>0||ret.length>0||x[2]==1) {
            ret.push(num + ' ' + x[num==1 ? 0 : 1]);
            seconds -= num*x[2];
          }
        });
        return ret.slice(0,2).join(' ');
      }
    
      // Bind to events
      Player.bind('player:video:play player:video:pause', function(e){
          $this.render(onRender);
      });
      Player.bind('player:video:loaded', function(e, video){
          $this.showLivePreview = (video.type=='stream' && video.streaming_p=='0');
          $this.showLiveCountdown = (video.type=='stream' && $this.showLivePreview && video.next_start_time.length && video.show_countdown_p=='1');
          $this.nextStartTime = (video.type=='stream' && video.next_start_time_epoch.length ? new Date(parseInt(video.next_start_time_epoch*1000)) : '');
          $this.render(onRender);
      });

      /* GETTERS */
      Player.getter('showLivePreview', function(){
          return $this.showLivePreview;
        });
      Player.getter('showLiveCountdown', function(){
          return $this.showLiveCountdown;
        });
      Player.getter('nextStartTime', function(){
          return $this.nextStartTime;
        });

      /* Reload the stream every now an then to see if it has gone live */
      var reloadStream = function(){
        var v = Player.get('video');
        if(v && v.type=='stream' && !Player.get('video_playable')) {
          v.reload(function(){
            if(Player.get('video_playable')) Player.set('playing', true);
          });
        }
        
        // If the stream is set to go live within the next 10 minutes, we'll reload every 20 seconds. Otherwise give it a minute.
        window.setTimeout(reloadStream, ($this.nextStartTime!='' && $this.nextStartTime-(new Date)<10*60*1000 ? 20000 : 60000));  
      }
      window.setTimeout(reloadStream, 30);
    
      return $this;
  }
);