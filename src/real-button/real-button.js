/*
  MODULE: PLAYBACK RATE BUTTON
  Allow toggling playback rate

  Listens for:
   - player:settings
   - player:video:loaded
*/

Player.provide('real-button',
  {
    enableRealButton: 1
  },
  function (Player, $, opts) {
    var $this = this;
    $.extend($this, opts);

    Player.bind('player:settings', function () {
      PlayerUtilities.mergeSettings($this, ['enableRealButton']);
      $this.render();
    });
    Player.bind('player:video:loaded', function (e) {
      $this.render();
    });

    // Getters and setters for UI state
    Player.getter('enableRealButton', function () {
      return $this.enableRealButton;
    });
    Player.getter('videoReal', function(){
      return Player.get('video') && Player.get('video').real_p
    });

    return $this;
  }
);
