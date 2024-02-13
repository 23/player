/*
  MODULE: PLAYBACK RATE BUTTON
  Allow toggling playback rate

  Listens for:
   - player:video:playbackratechange
*/

Player.provide('playback-rate-button',
  {
    enablePlaybackRate: 0,
    playbackRateMenuExpanded: false
  },
  function (Player, $, opts) {
    var $this = this;
    $.extend($this, opts);

    // Update UI when setting or playback range changes
    var onRender = function () {
      $this.button = $this.container.find(".playback-rate-button");
      $this.buttonMenu = $this.container.find(".button-menu");
      var playbackRatesCount = Player.get('playbackRatesArray').length;
      $this.button.one("mouseenter", function () {
        $this.buttonMenu.css({
          right: ($this.buttonMenu.width() - 30) / -2,
          fontSize: $this.container.find("li").height() * playbackRatesCount
        });
      });
    }
    Player.bind('player:settings', function () {
      PlayerUtilities.mergeSettings($this, ['enablePlaybackRate']);
      $this.render(onRender);
    });
    Player.bind('player:video:playbackratechange', function (e) {
      $this.render(onRender);
    });

    // Control rate option and labels
    Player.getter('playbackRatesArray', function () {
        return ([
            { rate: 0.25, label: '0.25x' },
            { rate: 0.5, label: '0.5x' },
            { rate: 0.75, label: '0.75x' },
            { rate: 1.0, label: '1x' },
            { rate: 1.25, label: '1.25x' },
            { rate: 1.5, label: '1.5x' },
            { rate: 1.75, label: '1.75x' },
            { rate: 2.0, label: '2x' }
        ]);
    });

    // Getters and setters for UI state
    Player.getter('enablePlaybackRate', function () {
      return $this.enablePlaybackRate;
    });
    Player.setter('enablePlaybackRate', function (epr) {
      $this.enablePlaybackRate = epr;
      Player.fire('player:video:playbackratechange');
    });
    Player.setter('playbackRateMenuExpanded', function (expand) {
      $this.playbackRateMenuExpanded = expand
    });
    Player.getter('playbackRateMenuExpanded', function(){
      return $this.playbackRateMenuExpanded
    });

    return $this;
  }
);

/* Translations for this module */
Player.translate("playbackRate", {
    en: "Play-back speed"
});
Player.translate("playbackRate_2", {
    en: "Play-back speed. Press enter key to change the speed."
});

