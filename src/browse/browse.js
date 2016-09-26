/* 
   MODULE: BROWSE (or recomendations)
   Let users browse for recommendations.

   Listens for:
   - player:video:loaded: The main video was loaded, possible load recommendations
   - player:settings: Update settings
   - player:loaded
   - player:video:playing

   Fires:
   - player:browse:updated
   - player:browse:loaded
   
   Answers properties:
   - showBrowse [get/set]
   - browseMode [get/set]
   - recommendationMethod [get]
   - hasRecommendations [get]
   - playlistClickMode [get/set]
   - browse_video_id [set]
*/

Player.provide('browse', 
  {
    showBrowse: true,
    browseMode: false,
    recommendationMethod: 'channel-popular',
    playlistClickMode:'inline',
    browseThumbnailWidth:400,
    browseThumbnailHeight:225
  },
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);

      // Load recommendations through the API
      $this.loadedRecommendations = false;
      $this.loadRecommendations = function(overwrite){
          if(typeof(overwrite)=='undefined') overwrite = false;
          if(overwrite) $this.loadedRecommendations = false;
          if ($this.loadedRecommendations || !Player.get('showBrowse')) return; 
          if (overwrite){
            var c = Player.get('clips');
            c = [];
          }

          // If we're looking at a single video, load some recommendations as well
          if(Player.get('clips').length<=1) {
              var opts = (/-new$/.test(Player.get('recommendationMethod')) ? {orderby:'uploaded', order:'desc'} : {orderby:'rank', order:'desc'});
              if(/^channel-/.test(Player.get('recommendationMethod'))) opts['album_id'] = Player.get('video_album_id');
              $this.loadedRecommendations = true;
              Player.get('api').photo.list(
                  $.extend({size:10, player_id:Player.get('player_id')}, opts),
                  function(data){
                      $.each(data.photos, function(i,photo){
                          if(photo.photo_id!=Player.get('video_photo_id')) {
                              Player.get('clips').push(new PlayerVideo(Player,$,'clip',photo));
                          }
                      });
                      Player.fire('player:browse:loaded');
                      Player.fire('player:browse:updated');
                  },
                  Player.fail
              );
          } else {
              Player.fire('player:browse:loaded');
              Player.fire('player:browse:updated');
          }
      };


      // Helper methods for skipping in and looping playlists
      $this.getCurrentVideoIndex = function(){
        var current_photo_id = Player.get('video_photo_id');
        var currentIndex = -1;
        var c = Player.get('clips');
        c.each(function(clip,i){
          if(clip.photo_id==current_photo_id) currentIndex = i;
        });
        return currentIndex;
      };
      $this.getNextVideo = function(){
        var c = Player.get('clips');
        var i = $this.getCurrentVideoIndex() + 1;
        if(!c[i]) {
          $this.loadRecommendations();
          i = 0;
        }
        return c[i];
      };
      $this.getPreviousVideo = function(){
        var c = Player.get('clips');
        var i = $this.getCurrentVideoIndex() - 1;
        if(i<0) i = 0;
        return c[i];
      };
      $this.playNextVideo = function(){
        Player.set('browse_photo_id', $this.getNextVideo().photo_id);
      };
      $this.playPreviousVideo = function(){
        Player.set('browse_photo_id', $this.getPreviousVideo().photo_id);
      };

      // Bind to events
      $this.firstLoad = true;
      Player.bind('player:video:loaded', function(){
          if($this.firstLoad) {
              PlayerUtilities.mergeSettings($this, ['showBrowse', 'browseMode', 'recommendationMethod', 'playlistClickMode']);
              Player.fire('player:browse:updated');
              $this.firstLoad = false;
          }
        });
      Player.bind('player:data:loaded', function(){
          $this.loadRecommendations();
      });
      Player.bind('player:video:playing', function(){
          Player.set('browseMode', false);
      });

      // Build a specific thumbnail for the browse pane
      Player.bind('player:loaded player:browse:loaded', function(){
          var c = Player.get('clips');
          $.each(c, function(i){
              c[i].browseThumbnailUrl = '/' + c[i].tree_id + '/' + c[i].photo_id + '/' + c[i].token + '/' + $this.browseThumbnailWidth + 'x' + $this.browseThumbnailHeight + 'cr/thumbnail.jpg';
          });
          var s = Player.get('streams');
          $.each(s, function(i){
              s[i].browseThumbnailUrl = '/' + s[i].thumbnail_tree_id + '/' + s[i].thumbnail_photo_id + '/' + s[i].thumbnail_token + '/' + $this.browseThumbnailWidth + 'x' + $this.browseThumbnailHeight + 'cr/thumbnail.jpg';
          });
          Player.fire('player:browse:updated');
        });

      // Render on browse update
      Player.bind('player:browse:updated', function(){
          $this.render(function(){
              _prevShow = false;
          });
        });

      /* GETTERS */
      Player.getter('showBrowse', function(){return $this.showBrowse;});
      Player.getter('browseMode', function(){return $this.browseMode;});
      Player.getter('recommendationMethod', function(){return $this.recommendationMethod;});
      Player.getter('hasRecommendations', function(){return (Player.get('clips').length+Player.get('streams').length>1);});
      Player.getter('nextVideo', function(){return $this.getNextVideo();});
      Player.getter('playlistClickMode', function(){return $this.playlistClickMode;});
      Player.getter('browseThumbnailWidth', function(){return $this.browseThumbnailWidth;});
      Player.getter('browseThumbnailHeight', function(){return $this.browseThumbnailHeight;});
      Player.getter('recommendations', function(){
          var objects = Player.get("streams").concat(Player.get("clips"));
          var recommendations = [];
          for(var i = 0; i < objects.length; i++) {
              var o = objects[i];
              if(o.type == "stream" && o.live_id != Player.get("video_live_id")){
                  recommendations.push(o);
              }
              if(o.type == "clip" && o.photo_id != Player.get("video_photo_id")){
                  recommendations.push(o);
              }
          }
          recommendations = recommendations.slice(0, 6);
          for(var j = 0; recommendations.length < 6; j++) {
              recommendations.push({type: "empty"});
          }
          return recommendations;
      });

      /* SETTERS */
      Player.setter('showBrowse', function(sb){
          $this.showBrowse = sb;
          $this.loadRecommendations();
      });
      var _browseTimeouts = [];
      var _prevShow = false;
      Player.setter('browseMode', function(bm){
          $this.browseMode = bm;
          if($this.browseMode){
              $this.browseMode = !Player.fire("player:module:overlayactivated", {name: "browse", prevented: false}).prevented;
          }
          if($this.browseMode != _prevShow){
              while(_browseTimeouts.length > 0){
                  clearTimeout(_browseTimeouts.pop());
              }
              Player.set("forcer", {type: "persist", element: "tray", active: $this.browseMode, from: "browse"});
              $this.container.find(".browse-container").show();
              _browseTimeouts.push(setTimeout(function(){
                  $this.container.find(".browse-container").toggleClass("browse-container-activated", $this.browseMode);
              }, 10));
              _browseTimeouts.push(setTimeout(function(){
                  $this.container.find(".browse-container").css({display: ""});
              }, 210));
              if($this.browseMode){ _resize(); }
              _prevShow = $this.browseMode;
          }
        });
      Player.setter('browse_photo_id', function(id){
          if(Player.get('playlistClickMode')=='link' && Player.get('permission_level')!='none') {
              Player.set('open_photo_id', {pi:id, target:"_blank"});
          } else if(Player.get('playlistClickMode')=='top' && Player.get('permission_level')!='none'){
              Player.set('open_photo_id', {pi:id, target:"_top"});
          } else {
              Player.set("currentTime", 0);
              Player.set('video_photo_id', id);
              Player.set('playing', true);
          }
        });
      Player.setter('browse_live_id', function(id){
          if(Player.get('playlistClickMode')=='link') {
              Player.set('open_live_id', {li:id,target:"_blank"});
          } else if(Player.get('playlistClickMode')=='top'){
              Player.set('open_live_id', {li:id,target:"_top"});
          } else {
              Player.set('video_live_id', id);
              Player.set('playing', true);
          }
      });

      Player.bind("player:module:overlayactivated", function(e, info){
          if(info.name != "browse"){
              Player.set("browseMode", false);
          }
          return info;
      });

      var _resize = function(){
          $this.container.find(".recommendation").each(function(i, el){
              var $el = $(el), $img = $el.find("img");
              var cw = $el.width(), ch = $el.height()
              var cr = cw / ch;
              var ir = 16/9;
              if(ir > cr){
                  $img.css({
                      top: 0,
                      left: (ir*ch-cw)/-2,
                      height: "100%",
                      width: "auto"
                  });
              }else{
                  $img.css({
                      top: (cw/ir-ch)/-2,
                      left: 0,
                      height: "auto",
                      width: "100%"
                  });
              }
          });
      };
      $(window).resize(_resize);

      return $this;
  }
);
