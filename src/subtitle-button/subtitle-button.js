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
          $this.button.one("mouseenter", function(){
            $this.buttonMenu.css({
              right: ($this.buttonMenu.width()-30)/-2,
              fontSize: $this.container.find("li").height()*(localeCount+1)
            });
          });
        }
      });
    });

    Player.getter('subtitleMenuWidget', function(){
      return (Player.get('localesArray').length>4 ? 'select' : 'menu');
    });

    Player.getter('initialSubtitleAriaLabel', function(){
      var subtitleOn = Player.get('subtitleLocale') != "";
      if (subtitleOn) return "subtitle_on";
      else return "subtitle_off";
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

Player.translate("subtitle_on",{
  en: "Captions button. The captions are turned on."
});
Player.translate("subtitle_off",{
  en: "Captions button. The captions are turned off."
});