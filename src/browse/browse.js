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
    loop: false,
    browseThumbnailWidth:180,
    browseThumbnailHeight:101
  },
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);

      $this.showAnimation = [{opacity:'show'}, 300];
      $this.hideAnimation = [{opacity:'hide'}, 200];

      // Render the browse interface and enable a simple carousel
      $this.build = function(){
          // Find the relavant elements in the template
          $this.browseLeft = $($this.container).find('.browse-left');
          $this.browseRight = $($this.container).find('.browse-right');
          $this.browseContainer = $($this.container).find('.browse-container');
          $this.browseItems = $($this.container).find('.browse-recommendations');

          if($this.browseLeft && $this.browseRight && $this.browseContainer && $this.browseItems) {
              $this.browseLeft.click(function(){$this.scroll(-1);});
              $this.browseRight.click(function(){$this.scroll(+1);});
              $this.handleScrollThumbs();
          }
      }
      $this.handleScrollThumbs = function(){
          try {
              var itemsHeight = $this.browseItems.height();
              if(itemsHeight==0) {
                  window.setTimeout($this.handleScrollThumbs, 800);
                  return;
              }
              var itemsTop = $this.browseItems.position()['top'];
              var containerHeight = $this.browseContainer.height();
              $this.browseLeft.toggle( itemsTop < 0);
              $this.browseRight.toggle( itemsTop > (itemsHeight-containerHeight)*-1 );
          }catch(e){
	      window.setTimeout($this.handleScrollThumbs, 1000);
	  }
      }
      $this.scroll = function(direction){
          try {
              var itemsHeight = $this.browseItems.height();
              var itemsTop = $this.browseItems.position()['top'];
              var containerHeight = $this.browseContainer.height();
              var newTop = itemsTop + ((direction*containerHeight)*-1); // scroll by a full screen
              newTop = Math.min(0, Math.max(newTop, (itemsHeight-containerHeight)*-1)); // then enforce min and max
              $this.browseItems.animate({top:newTop+'px'}, function(){
                  $this.handleScrollThumbs();
              });
          }catch(e){console.log(e);}
      }
      $(window).bind('load resize', $this.handleScrollThumbs);

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
              Player.get('api').photo.list(
                  $.extend({size:10, player_id:Player.get('player_id')}, opts),
                  function(data){
                      $this.loadedRecommendations = true;
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
      }


      // Helper methods for skipping in and looping playlists
      $this.getCurrentVideoIndex = function(){
        var current_photo_id = Player.get('video_photo_id')
        var currentIndex = -1;
        var c = Player.get('clips');
        c.each(function(clip,i){
          if(clip.photo_id==current_photo_id) currentIndex = i;
        });
        return currentIndex;
      }
      $this.getNextVideo = function(){
        var c = Player.get('clips');
        var i = $this.getCurrentVideoIndex() + 1;
        if(!c[i]) {
          $this.loadRecommendations(true);
          i = 0;
        }
        return c[i];
      }
      $this.getPreviousVideo = function(){
        var c = Player.get('clips');
        var i = $this.getCurrentVideoIndex() - 1;
        if(i<0) i = 0;
        return c[i];
      }
      $this.playNextVideo = function(){
        Player.set('browse_photo_id', $this.getNextVideo().photo_id);
      }      
      $this.playPreviousVideo = function(){
        Player.set('browse_photo_id', $this.getPreviousVideo().photo_id);
      }      
      
      // Bind to events
      $this.firstLoad = true;
      Player.bind('player:video:loaded', function(){
          if($this.firstLoad) {
              PlayerUtilities.mergeSettings($this, ['showBrowse', 'browseMode', 'recommendationMethod', 'playlistClickMode', 'loop']);
              $this.loadRecommendations();
              Player.fire('player:browse:updated');
              $this.firstLoad = false;
          } else {
              Player.set('browseMode', false);
          }
        });
      Player.bind('player:video:playing', function(){
          Player.set('browseMode', false);
      });
      Player.bind('player:video:ended', function(){
          if($this.loop) {
              $this.playNextVideo();
          } else if($this.showBrowse) {
              Player.set('browseMode', true);
          }
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
          $this.render($this.build);
        });

      /* GETTERS */
      Player.getter('showBrowse', function(){return $this.showBrowse});
      Player.getter('browseMode', function(){return $this.browseMode});
      Player.getter('recommendationMethod', function(){return $this.recommendationMethod});
      Player.getter('hasRecommendations', function(){return (Player.get('clips').length+Player.get('streams').length>1)});
      Player.getter('playlistClickMode', function(){return $this.playlistClickMode});
      Player.getter('browseThumbnailWidth', function(){return $this.browseThumbnailWidth});
      Player.getter('browseThumbnailHeight', function(){return $this.browseThumbnailHeight});

      /* SETTERS */
      Player.setter('showBrowse', function(sb){
          $this.showBrowse = sb;
          $this.loadRecommendations();
        });
      Player.setter('browseMode', function(bm){
          if(bm) {
              $('.activebutton').removeClass('activebutton').parent().removeClass('activebutton-container');
              Player.set('showSharing', false);
          }
          $this.browseMode = bm;
          Player.fire('player:browse:updated');
        });
      Player.setter('browse_photo_id', function(id){
          if(Player.get('playlistClickMode')=='link') {
              Player.set('open_photo_id', {pi:id, target:"_blank"});
          } else if(Player.get('playlistClickMode')=='top'){
              Player.set('open_photo_id', {pi:id, target:"_top"});
          } else {
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

      return $this;
  }
);
