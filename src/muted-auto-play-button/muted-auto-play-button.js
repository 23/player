/*
   MODULE: MUTED AUTO PLAY BUTTON
   Muted auto play
*/

Player.provide('muted-auto-play-button',
  {
    unmuteButtonPosition: 'bottomCenter'
  },
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);

    PlayerUtilities.mergeSettings($this, ['unmuteButtonPosition']);

    // Update element on play, pause and more
    Player.bind('player:video:volumechange player:video:play player:video:pause player:video:loaded player:subtitlechange', function(e){
      $this.render();
    });

    Player.getter('unmuteButtonPosition', function() {
      var ret = $this.unmuteButtonPosition || 'bottomCenter';
      if(ret=='bottomCenter' && Player.get('hasSubtitles') && Player.get('enableSubtitles')) {
        ret = 'topRight';
      }
      return ret;
    });
    Player.setter('unmuteButtonPosition', function(ubp) {
      $this.unmuteButtonPosition = ubp;
      $this.render();
    });

    return $this;
  }

);

Player.translate("muted-autoplay",{
  en: "Muted volume. Press enter or space key to unmute."
});
