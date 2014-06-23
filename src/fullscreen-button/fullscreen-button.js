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

    // Toogle fullscreen on alt+enter
    $(window).keydown(function(e){
        if((e.altKey||e.metaKey) && (e.charCode==32 || e.keyCode==13)) {
          Player.set('fullscreen', !Player.get('fullscreen'));
        }
      });

    // Update UI when full screen changes
    Player.bind('player:video:fullscreenchange player:loaded player:video:ready', function(e){
        $this.container.toggle(Player.get('supportsFullscreen'));
        $this.render();
      });

    // Hide elements when Flash is prompting for full screen
    Player.bind('player:video:fullscreenprompt', function(e){
        $('.big-button, .video-canvas div').hide();
      });
    Player.bind('player:video:clearfullscreenprompt', function(e){
        $('.big-button, .video-canvas div').show();
      });
    Player.bind('player:video:enterfullscreen', function(e){
        Player.set('playing', true);
        Player.set('analyticsEvent', 'fullscreen');
      });

    /* GETTERS */
    Player.getter('supportsFullscreen', function(){
        var ve = Player.get('videoElement');
        return (ve ? ve.hasFullscreen() : false);
      });
    Player.getter('fullscreen', function(){
        var ve = Player.get('videoElement');
        return (ve ? ve.isFullscreen() : false);
      });
    /* SETTERS */
    Player.setter('fullscreen', function(fs){
        if(!Player.get('supportsFullscreen')) return;
        var ve = Player.get('videoElement');
        if(ve) {
            if(fs) {
                ve.enterFullscreen();
            } else {
                ve.leaveFullscreen();
            }
        }
      });

    return $this;
  }
);

/* Translations for this module */
Player.translate("toggle_fullscreen",{
    en: "Toggle fullscreen"
});
