/*
   MODULE: SUBTITLE BUTTON
   Handle subtitle button
*/

Player.provide('audiodescription-button',
  {},
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);

    // Update UI when subtitle changes
    Player.bind('player:subtitlechange player:audiodescriptionchanged', function(e){
      $this.render(function(){
        $this.button = $this.container.find(".audiodescription-button");
          $this.buttonMenu = $this.container.find(".button-menu");
          var localeCount = Player.get('audioDescriptionTracksArray').length;
          $this.button.one("mouseenter", function(){
            $this.buttonMenu.css({
              fontSize: $this.container.find("li").height()*(localeCount+1),
              maxHeight: $this.container.find("li").height()*4
            });
          });
      });
    });

    Player.getter('initialAudioDescriptionAriaLabel', function(){
      var descriptionOn = Player.get('audioDescriptionLocale') != "";
      if (descriptionOn) return "description_on";
      else return "description_off";
    });

    return $this;
  }
);

/* Translations for this module */
Player.translate("audiodescriptions",{
    en: "Audio descriptions"
});
Player.translate("audio_descriptions_in",{
    en: "Audio descriptions in"
});
Player.translate("disable_audio_descriptions",{
    en: "Disable audio descriptions"
});
Player.translate("description_on",{
  en: "Audio description button. The audio description is turned on."
});
Player.translate("description_off",{
  en: "Audio description button. The audio description is turned off."
});
