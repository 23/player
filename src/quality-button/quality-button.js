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

    // Update UI when quality changes
    Player.bind('player:video:qualitychange', function(e){
        $this.render(function(){
            $this.button = $this.container.find(".quality-button");
            $this.buttonMenu = $this.container.find(".button-menu");
            var qualityCount = Player.get('qualitiesArray').length;
            $this.button.one("mouseenter", function(){
                $this.buttonMenu.css({
                    right: ($this.buttonMenu.width()-30)/-2,
                    fontSize: $this.container.find("li").height()*qualityCount + 12
                });
            });
        });
    });

    // Only show the button with more than a single element
    Player.getter('hasQualitySwitching', function(){return Player.get('qualitiesArray').length>1;});

    return $this;
  }
);

/* Translations for this module */
Player.translate("quality",{
    en: "Quality menu"
});
Player.translate("quality_2",{
    en: "quality. Press enter key to choose this quality."
});
