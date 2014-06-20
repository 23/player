/*
   MODULE: LIVE PREVIEW
   A module with status and countdown to live streams with preview thumbnails.

   Listens for:
   - player:video:loaded
   - player:video:play
   - player:video:pause

   Answers properties:
   - showLivePreview [get]
   - showLiveTime [get]
   - nextStartTime [get]
*/

Player.provide('live-preview',
  {
      scrubberColor: "#eeeeee"
  },
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);
      $this.showAnimation = [{opacity:'show'}, 400];

      $this.nextStartTime = '';
      $this.showLivePreview = false;
      $this.showLiveTime = false;
      $this.showStreamNotLive = false;
      $this.previewColor = "light";
      $this.showLocalTime = false;

      var onRender = function(){
        $this.container.find('.preview-thumbnail').css({backgroundImage:'url(' + Player.get('url') + Player.get('video').preview_large_download + ')'});
        $this.container.find('.preview-background').css({backgroundColor: $this.scrubberColor, opacity: 0.8});
      }

      // Bind to events
      Player.bind('player:video:play player:video:pause', function(e){
          $this.render(onRender);
      });
      Player.bind('player:video:loaded', function(e, video){
          if(video.streaming_p && !video.broadcasting_p) {
            $this.showStreamNotLive = true;
            $this.showLivePreview = false;
            $this.showLiveTime = false;
            $this.nextStartTime = "";
            $this.nextStartTimeLocale = "";
            $this.location = '';
          } else {
            $this.showStreamNotLive = false;
            $this.showLivePreview = (video.type=='stream' && video.broadcasting_p=='0');
            $this.showLiveTime = (video.type=='stream' && $this.showLivePreview && video.next_start_time.length);
            $this.nextStartTime = (video.type=='stream' && $this.showLivePreview? video.next_start_time__date+", "+video.next_start_time__time:"");
            $this.nextStartTimeLocale = (video.type=='stream' && video.next_start_time_epoch.length ? new Date(parseInt(video.next_start_time_epoch*1000)).toLocaleString() : '');
            $this.location = (video.type=='stream' && video.display_location.length ? video.display_location : '');
          }
          $this.render(onRender);
      });

      Player.bind('player:settings', function(e){
          PlayerUtilities.mergeSettings($this, ['scrubberColor']);
          var rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec($this.scrubberColor);
          if(parseInt(rgb[1],16)+parseInt(rgb[2],16)+parseInt(rgb[3],16)<382){
              $this.previewColor = "light";
          }else{
              $this.previewColor = "dark";
          }
          $this.container.css({"color": ($this.previewColor=="light"?"#FFF":"#7E7B73")});
          $this.render(onRender);
      });

      /* GETTERS */
      Player.getter('showLivePreview', function(){
          return $this.showLivePreview;
        });
      Player.getter('showLiveTime', function(){
          return $this.showLiveTime;
        });
      Player.getter('nextStartTime', function(){
          return $this.nextStartTime;
        });
      Player.getter('nextStartTimeLocale', function(){
          return $this.nextStartTimeLocale;
      });

      Player.getter('streamLocation', function(){
          return $this.location;
      });

      Player.getter('showStreamNotLive', function(){
          return $this.showStreamNotLive;
        });

      Player.getter('previewColor', function(){
          return $this.previewColor;
      });
      Player.getter('showLocalTime', function(){
          return $this.showLocalTime;
      });


      Player.setter('showLocalTime', function(sl){
          $this.showLocalTime = sl;
          $this.render(onRender);
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

/* Translations for this module */
Player.translate("stream_preview",{
    en: "Stream preview"
});
Player.translate("not_being_broadcast",{
    en: "Not being broadcast live"
});
Player.translate("live_on",{
    en: "Live on"
});
Player.translate("show_my_local",{
    en: "Show my local time"
});
Player.translate("this_event_is_not",{
    en: "This event is not live right now"
});
