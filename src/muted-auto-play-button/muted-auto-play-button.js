/* 
   MODULE: MUTED AUTO PLAY BUTTON
   Muted auto play
*/

Player.provide('muted-auto-play-button', 
  {},
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);

    PlayerUtilities.mergeSettings($this, ['unmuteButtonPosition']);

    // Update element on play, pause and more
    Player.bind('player:video:volumechange player:video:play player:video:pause player:video:loaded', function(e){
      $this.render();
    });

    Player.getter('unmuteButtonPosition', function() {
      return $this.unmuteButtonPosition || 'bottomCenter';
    });

    return $this;
  }

);

Player.translate("muted-autoplay",{
  en: "Muted volume. Press enter or space key to unmute."
});
