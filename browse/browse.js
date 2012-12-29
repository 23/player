/* 
   MODULE: BROWSE (or recomendations)
   Let users browse for recommendations.

   Listens for:
   - player:video:loaded: The main video was loaded, possible load recommendations
   - player:settings: Update settings

   Fires:
   - player:browse:updated
   - player:browse:loaded
   
   Answers properties:
   - showBrowse [get/set]
   - browseMode [get/set]
   - recommendationMethod [get]
   - maxRecommendations [get]
   - hasRecommendations [get]
   - playlistClickMode [get/set]
*/

Player.provide('browse', 
  {
    showBrowse: true,
    browseMode: false,
    recommendationMethod: 'channel-popular',
    playlistClickMode:'link'
  },
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);

      $this.loadedRecommendations = false;
      $this.loadRecommendations = function(){
          // If we're looking at a single video, load some recommendations as well
          if(!$this.loadedRecommendations && Player.get('clips').length==1 && Player.get('showBrowse')) {
              var opts = (/-new$/.test(Player.get('recommendationMethod')) ? {orderby:'uploaded', order:'desc'} : {orderby:'rank', order:'desc'});
              if(/^channel-/.test(Player.get('recommendationMethod'))) opts['album_id'] = Player.get('video_album_id');
              Player.get('api').photo.list(
                  $.extend({size:Player.get('maxRecommendations')-1, player_id:Player.get('player_id')}, opts),
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
          }
      }


      // Bind to events
      Player.bind('player:video:loaded', function(){
          PlayerUtilities.mergeSettings($this, ['showBrowse', 'browseMode', 'recommendationMethod', 'playlistClickMode']);
          $this.loadRecommendations();
        });

      // Render on browse update
      Player.bind('player:browse:updated', function(){
          $this.render();
        });

      /* GETTERS */
      Player.getter('showBrowse', function(){return $this.showBrowse});
      Player.getter('browseMode', function(){return $this.browseMode});
      Player.getter('recommendationMethod', function(){return $this.recommendationMethod});
      Player.getter('hasRecommendations', function(){return Player.get('clips').length>1});
      Player.getter('maxRecommendations', function(){return Player.get('settings').maxRecommendations});
      Player.getter('playlistClickMode', function(){return $this.playlistClickMode});
     
      /* SETTERS */
      Player.setter('showBrowse', function(sb){
          $this.showBrowse = sb;
          $this.loadRecommendations();
        });
      Player.setter('browseMode', function(bm){
          $this.browseMode = bm;
          Player.fire('player:browse:updated');
        });

      return $this;
  }
);
