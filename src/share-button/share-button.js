/*
 MODULE: SHARE BUTTON
 Show share button, engaging the sharing pane

 Listens for:
 - player:sharing
*/

Player.provide(
  "share-button",
  {
    socialSharing: false,
    showSharing: false,
    showDownload: false,
  },
  function (Player, $, opts) {
    var $this = this;
    $.extend($this, opts);

    $this.render($this.toggleShareButton);

    $this.toggleShareButton = function () {
      window.setTimeout(function () {
        $this.container.toggle(
          !!Player.get("socialSharing") &&
            !(
              Player.get("unmuteButtonPosition") == "topRight" &&
              Player.get("showMutedAutoPlayButton")
            ),
        );
      }, 10);
    };

    Player.bind(
      "player:settings player:video:loaded player:subtitlechange",
      $this.toggleShareButton,
    );

    Player.getter("socialSharing", function () {
      return (
        typeof $this.socialSharing != "undefined" &&
        $this.socialSharing &&
        $this.socialSharing != "0" &&
        Player.get("video_sharable")
      );
    });
    Player.getter("showDownload", function () {
      return $this.showDownload && Player.get("video_type") == "clip";
    });

    Player.setter("socialSharing", function (ss) {
      $this.socialSharing = ss;
      $this.container
        .find(".share-button")
        .css({ display: $this.socialSharing ? "block" : "none" });
    });

    return $this;
  },
);

/* Translations for this module */
Player.translate("share_video", {
  en: "Share video",
});
