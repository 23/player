/*
   MODULE: INFO
   Show title and description for the video

   Listens for:
   - player:settings: The app was loaded, time to show the info pane
   - player:video:loaded: New title and description to show

   Listens for:
   - player:infoengaged: Info pane was toggles somehow

   Answers properties:
   - showDomain [get/set]
   - showDescriptions [get/set]
   - infoTimeout [get]
*/

Player.provide(
  "info",
  {
    showDescriptions: true,
    showDomain: true,
  },
  function (Player, $, opts) {
    var $this = this;
    $.extend($this, opts);

    $this.onRender = function () {
      Player.set(
        "infoShown",
        (!!$this.showDescriptions || !!$this.showDomain) &&
          Player.get("playflowPosition") <= 1,
      );
    };

    // Bind to events
    Player.bind("player:settings", function (e) {
      PlayerUtilities.mergeSettings($this, ["showDescriptions", "showDomain"]);
      $this.render($this.onRender);
    });
    Player.bind("player:video:loaded", function (e, video) {
      $this.render($this.onRender);
    });
    Player.bind("player:video:play player:video:playing", function (e, video) {
      Player.set("infoShown", false);
    });

    /* GETTERS */
    Player.getter("infoShown", function () {
      return $this.infoShown;
    });
    Player.getter("showDomain", function () {
      return $this.showDomain;
    });

    Player.getter("showDescriptions", function () {
      return $this.showDescriptions;
    });

    /* SETTERS */

    Player.setter("showDomain", function (sd) {
      $this.showDomain = sd;
      $this.render($this.onRender);
    });

    Player.setter("showDescriptions", function (sd) {
      $this.showDescriptions = sd;
      $this.render($this.onRender);
    });

    Player.setter("infoShown", function (is) {
      $this.infoShown = is;
      Player.set("forcer", {
        type: "block",
        element: "tray",
        from: "info",
        active: $this.infoShown,
      });
      $this.container
        .find(".info-overlay")
        .css({ display: $this.infoShown ? "block" : "none" });
    });

    $this.render();
    return $this;
  },
);
