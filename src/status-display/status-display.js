/* 
 MODULE: STATUS DISPLAY
 Display loading indication and errors, including information when video is not supported.
 
 Answers properties:
 - error [get/set]
 - loading [get/set]

 Listens for:
 - player:video:displaydevice
 - player:video:progress 
 - player:video:timeupdate 
 - player:video:flashloaded
 - player:video:seeking 
 - player:video:seeked 
 - player:video:stalled 
 - player:video:play 
 - player:video:playing
*/

Player.provide('status-display', 
  {}, 
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);
    $this.render();

    /* Loading */
    Player.bind('player:video:ready', function(e){
        if($this.loading) Player.set('loading', false);
      });
    $this.loading = true;
    Player.setter('loading', function(loading){
        $this.loading = loading;
        $this.render();
      });
    Player.getter('loading', function(){
        return $this.loading;
      });

    /* Error handling */
    Player.bind('player:video:loaded', function(e){
        $this.render();
      });
    $this.errorMessage = "";
    Player.setter('error', function(errorMessage){
        Player.set('loading', false);
        $this.errorMessage = errorMessage;
        $this.render();
      });
    Player.getter('error', function(){
        return $this.errorMessage;
      });

    /* Seeking or stalled */
    Player.bind('player:video:progress player:video:timeupdate player:video:flashloaded player:video:seeking player:video:seeked player:video:stalled player:video:play player:video:pause player:video:playing', function(e){
      if(Player.get('showSeeking')||Player.get('displayDevice')=='none'||(Player.get('error')&&Player.get('error')!='')||Player.get('loading')){
        $this.render();
        $this.rendered = true;
      }else{
        if($this.rendered){
          $this.container.html("");
          $this.rendered = false;
        }
      }
    });
    Player.getter('showSeeking', function(){
        return Player.get('video_playable') && (Player.get('seeking') || Player.get('stalled'))
      });

    return $this;
  }
          
);
