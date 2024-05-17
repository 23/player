/*
 MODULE: SHARE BUTTON
 Show share button, engaging the sharing pane

 Listens for:
 - player:sharing
*/

Player.provide('share-button',
  {},
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);

    $this.render($this.toggleShareButton);

    $this.toggleShareButton = function(){
      window.setTimeout(function(){
        $this.container.toggle(!!Player.get("socialSharing") && Player.get('unmuteButtonPosition')!='topRight');
      }, 10);
    };

    Player.bind('player:settings player:video:loaded player:subtitlechange', $this.toggleShareButton);

    return $this;
  }

);

/* Translations for this module */
Player.translate("share_video",{
    en: "Share video"
});
