/* 
   MODULE: SUBTITLE BUTTON
   Handle subtitle button
   
  Listens for:
   - player:subtitlechange
*/

Player.provide('subtitle-button', 
  {}, 
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);

    // Update UI when subtitle changes
    Player.bind('player:subtitlechange', function(e){
        $this.render();
      });
      
    return $this;
  }
);

/* Translations for this module */
Player.translate("close_captioning",{
    en: "Closed captioning"
});
Player.translate("closed_captions_in",{
    en: "Closed captions in"
});
Player.translate("disable_closed_captioning",{
    en: "Disable closed captioning"
});
Player.translate("none",{
    en: "None"
});
