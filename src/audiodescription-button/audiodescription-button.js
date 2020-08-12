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
        if(Player.get('audioDescriptionsMenuWidget')=='menu') {
          $this.button = $this.container.find(".audiodescription-button");
          $this.buttonMenu = $this.container.find(".button-menu");
          var localeCount = Player.get('audioDescriptionTracksArray').length;
          $this.button.one("mouseenter", function(){
            $this.buttonMenu.css({
              right: ($this.buttonMenu.width()-30)/-2,
              fontSize: $this.container.find("li").height()*(localeCount+1)
            });
          });
        }
      });
    });

    Player.getter('audioDescriptionsMenuWidget', function(){
      return (Player.get('audioDescriptionTracksArray').length>4 ? 'select' : 'menu');
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
