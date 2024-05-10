/*
  MODULE: slides-button

  A button to toggle display of the slides overview defined in the "slides" module

*/

Player.provide('slides-button',{

},function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);

    Player.bind("player:slides:loaded player:slides:init player:slides:modechange", function(e){
        $this.render(function(){
            $this.button = $this.container.find(".slides-button");
            $this.buttonMenu = $this.container.find(".button-menu");
            var slidemodeCount = Player.get('slideModes').length;
            $this.buttonMenu.css({
                fontSize: $this.container.find("li").height()*slidemodeCount
            });
        });
    });

    return $this;
});
