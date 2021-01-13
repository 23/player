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
    Player.bind('player:video:loaded', function(e){
        $this.render();
      });

    /* Error handling + Warning messages */
    $this.errorMessage = "";
    Player.setter('error', function(errorMessage){
      if(Player.get('embeddedCompatibility')) return;
      Player.set('loading', false);
      $this.errorMessage = errorMessage;
      $this.render();
    });
    Player.getter('error', function(){
      return $this.errorMessage;
    });

    $this.warningMessage = "";
    Player.setter('warning', function(warningMessage){
      $this.warningMessage = warningMessage;
      $this.render();
    });
    Player.getter('warning', function(){
      return $this.warningMessage;
    });

    /* Seeking or stalled */
    Player.bind('player:video:progress player:video:timeupdate player:video:flashloaded player:video:seeking player:video:seeked player:video:stalled player:video:play player:video:pause player:video:playing', function(e){
      if(Player.get('showSeeking')||Player.get('displayDevice')=='none'||(Player.get('error')&&Player.get('error')!='')||Player.get('loading')||Player.get('warning')){
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


    Player.getter('embeddedCompatibility', function(){
      return (window.parent !== window && /MSIE ([6-9])/.test(navigator.userAgent))
    });

    return $this;
  }
          
);

/* Translations for this module */
Player.translate("browser_does_not_support",{
    en: "Your browser does not support video playback."
});
Player.translate("to_view_this_content",{
    en: "To view this content, you will need to upgrade your browser."
});
