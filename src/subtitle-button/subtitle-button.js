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
      $this.render(function(){
        if(Player.get('subtitleMenuWidget')=='menu') {
          $this.button = $this.container.find(".subtitle-button");
          $this.buttonMenu = $this.container.find(".button-menu");
          var localeCount = Player.get('localesArray').length;
          $this.buttonMenu.css({
            fontSize: $this.container.find("li").height()*(localeCount+1)
          });
          $this.button.one("mouseenter", function(){
            $this.buttonMenu.css({
              right: ($this.buttonMenu.width()-30)/-2
            });
          });
        }
      });
    });

    Player.getter('subtitleMenuWidget', function(){
      return (Player.get('localesArray').length>4 ? 'select' : 'menu');
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
