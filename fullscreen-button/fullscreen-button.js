/* 
   MODULE: FULLSCREEN BUTTON
   Handle full screen button and shortcut.
   
   Fires:
   - player:fullscreenchange
   
   Answers properties:
   - supportsFullscreen [get]
   - fullscreen [get/set]
*/

Player.provide('fullscreen-button', 
  {}, 
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);
    $this.render();

    // Toogle fullscreen on click
    $this.container.click(function(e){
        e.stopPropagation();
        Player.set('fullscreen', !Player.get('fullscreen'));
        Player.set('playing', true);
        return false;
      });

    // Toogle fullscreen on alt+enter
    $(window).keydown(function(e){
        console.debug(e);
        if((e.altKey||e.metaKey) && (e.charCode==32 || e.keyCode==13)) {
          Player.set('fullscreen', !Player.get('fullscreen'));
          Player.set('playing', true);
        }
      });

    // Notify elements when fullscreen changes
    $(document).bind('fullscreenchange mozfullscreenchange webkitfullscreenchange', function(e){
        Player.fire('player:fullscreenchange');
      });

    // Update UI when full screen changes
    Player.bind('player:fullscreenchange', function(e){
        $this.render();
      });

    /* GETTERS */
    Player.getter('supportsFullscreen', function(){
        var de = document.documentElement;
        return ((
                 (de.requestFullScreen||de.mozRequestFullScreen||de.webkitRequestFullScreen)
                 &&
                 (document.fullScreenEnabled||document.mozFullScreenEnabled||document.webkitFullscreenEnabled)
                 ) ? true : false);
      });
    Player.getter('fullscreen', function(){
        return Player.get('supportsFullscreen') && (document.mozFullScreen||document.webkitIsFullScreen);
      });

    /* SETTERS */
    Player.setter('fullscreen', function(fs){
        if(!Player.get('supportsFullscreen')) return;
        if(fs) {
          var de = document.documentElement;
          if(de.requestFullScreen) {
            de.requestFullScreen();
          } else if(de.mozRequestFullScreen) {
            de.mozRequestFullScreen();
          } else if(de.webkitRequestFullScreen) {
            de.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
          }
        } else {
          if(document.cancelFullScreen) {
            document.cancelFullScreen();
          } else if(document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
          } else if(document.webkitCancelFullScreen) {
            document.webkitCancelFullScreen();
          }
        }
      });
      
    return $this;
  }
);
