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
      $this.container.toggle(!!Player.get("socialSharing"));
    };

    Player.bind('player:video:loaded', $this.toggleShareButton);

    return $this;
  }
          
);

/* Translations for this module */
Player.translate("share_video",{
    en: "Share video"
});
