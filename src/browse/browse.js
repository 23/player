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
    browseThumbnailWidth:120,
    browseThumbnailHeight:68
  },
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);

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
              var itemsWidth = $this.browseItems.width();
              if(itemsWidth==0) {
                  window.setTimeout($this.handleScrollThumbs, 800);
                  return;
              }
              var itemsLeft = $this.browseItems.position()['left'];
              var containerWidth = $this.browseContainer.width();
              $this.browseLeft.toggle( itemsLeft < 0);
              $this.browseRight.toggle( itemsLeft > (itemsWidth-containerWidth)*-1 );
          }catch(e){}
      }
      $this.scroll = function(direction){
          try {
              var itemsWidth = $this.browseItems.width();
              var itemsLeft = $this.browseItems.position()['left'];
              var containerWidth = $this.browseContainer.width();
              var newLeft = itemsLeft + ((direction*containerWidth)*-1); // scroll by a full screen
              newLeft = Math.min(0, Math.max(newLeft, (itemsWidth-containerWidth)*-1)); // then enforce min and max
              $this.browseItems.animate({left:newLeft+'px'}, function(){
                  $this.handleScrollThumbs();
              });
          }catch(e){}
      }
      $(window).bind('load resize', $this.handleScrollThumbs);

      // Load recommendations through the API
      $this.loadedRecommendations = false;
      $this.loadRecommendations = function(){
          if ($this.loadedRecommendations || !Player.get('showBrowse')) return; 

          // If we're looking at a single video, load some recommendations as well
          if(Player.get('clips').length==1) {
              var opts = (/-new$/.test(Player.get('recommendationMethod')) ? {orderby:'uploaded', order:'desc'} : {orderby:'rank', order:'desc'});
              if(/^channel-/.test(Player.get('recommendationMethod'))) opts['album_id'] = Player.get('video_album_id');
              Player.get('api').photo.list(
                  $.extend({size:10, player_id:Player.get('player_id')}, opts),
                  function(data){
                      $this.loadedRecommendations = true;
                      $.each(data.photos, function(i,photo){
                          Player.get('clips').push(new PlayerVideo(Player,$,'clip',photo));
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


      // Bind to events
      $this.firstLoad = true;
      Player.bind('player:video:loaded', function(){
          if($this.firstLoad) {
              PlayerUtilities.mergeSettings($this, ['showBrowse', 'browseMode', 'recommendationMethod', 'playlistClickMode']);
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

      // Build a specific thumbnail for the browse pane
      Player.bind('player:loaded player:browse:loaded', function(){
          var c = Player.get('clips');
          $.each(c, function(i){
              c[i].browseThumbnailUrl = '/' + c[i].tree_id + '/' + c[i].photo_id + '/' + c[i].token + '/' + $this.browseThumbnailWidth + 'x' + $this.browseThumbnailHeight + 'cr/thumbnail.jpg';
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
      Player.getter('hasRecommendations', function(){return Player.get('clips').length>1});
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
              Player.set('showSharing', false);
              Player.set('showDescriptions', false);
          }
          $this.browseMode = bm;
          Player.fire('player:browse:updated');
        });
      Player.setter('browse_photo_id', function(id){
          if(Player.get('playlistClickMode')=='link') {
              Player.set('open_photo_id', id);
          } else {
              Player.set('video_photo_id', id);
              Player.set('playing', true);
          }
        });

      return $this;
  }
);
