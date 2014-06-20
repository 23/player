/* 
   MODULE: QUALITY BUTTON
   Handle quality switching
   
  Listens for:
   - player:video:qualitychange
*/

Player.provide('quality-button', 
  {}, 
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);

    // Update UI when subtitle changes
    Player.bind('player:video:qualitychange', function(e){
        $this.render();
      });

    // Only show the button with more than a single element
    Player.getter('hasQualitySwitching', function(){return Player.get('qualitiesArray').length>1;});

    return $this;
  }
);

/* Translations for this module */
Player.translate("quality",{
    en: "Quality"
});
Player.translate("quality_2",{
    en: "quality"
});
