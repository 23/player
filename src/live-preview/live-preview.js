/*
   MODULE: LIVE PREVIEW
   A module with status and countdown to live streams with preview thumbnails.

   Listens for:
   - player:video:loaded

   Answers properties:
   - showLivePreview [get]
   - showLiveTime [get]
*/

Player.provide('live-preview',
  {
    showStreamingPreviewLabel:true
  },
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);
      PlayerUtilities.mergeSettings($this, ['showStreamingPreviewLabel']);
      $this.showAnimation = [{opacity:'show'}, 400];

      $this.showLivePreview = false;
      $this.showStreamNotLive = false;
      $this.nextStartTime = "";

      $this.onRender = function(){
          if($this.showLivePreview){
              var $iframe = $this.container.find("iframe");
              $iframe.on("load", function(e){
                  var iframe = $iframe.get(0);
                  // Check if we have access to contents of iframe
                  if(iframe.contentDocument && iframe.contentDocument.body){
                      // Make clicks on thumbnails open videos inside the player
                      $(iframe.contentDocument.body).find("a[data-id]").each(function(i, element){
                          $(element).on("click", function(e){
                              var id = $(this).data("id");
                              if(id){
                                  Player.set("video_photo_id", id);
                                  Player.set("playing", true);
                                  e.preventDefault();
                              }
                          });
                      });
                      // Listen for context menu events inside the iframe and activate the player's menu
                      $(iframe.contentDocument).on("contextmenu", function(e){
                          Player.set("showMenu", e);
                          e.preventDefault();
                      });
                  }
              });
          }
      };
    
      // Bind to events
      Player.bind('player:video:loaded', function(e, video){
          var prevShowLivePreview = $this.showLivePreview;
          var prevNextStartTime = $this.nextStartTime;
          if(video.streaming_p && !video.broadcasting_p) {
            $this.showStreamNotLive = true;
            $this.showLivePreview = false;
            $this.nextStartTime = "";
          } else {
            $this.showStreamNotLive = false;
            $this.showLivePreview = (video.type=='stream' && video.broadcasting_p=='0');
            $this.nextStartTime = (video.type=='stream' && $this.showLivePreview? video.next_start_time__date+", "+video.next_start_time__time:"");
          }
          // If streaming conditions have changed, rerender module
          if(prevShowLivePreview != $this.showLivePreview || prevNextStartTime != $this.nextStartTime) {
              $this.render($this.onRender);
          }
      });

      /* GETTERS */
      Player.getter('showLivePreview', function(){return $this.showLivePreview;});
      Player.getter('showStreamNotLive', function(){return $this.showStreamNotLive && $this.showStreamingPreviewLabel;});

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
      };
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
