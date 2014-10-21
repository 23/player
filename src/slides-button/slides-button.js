/*
  MODULE: slides-button

  A button to toggle display of the slides overview defined in the "slides" module

*/

Player.provide('slides-button',{

},function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);


    Player.bind("player:slides:overviewchange player:slides:loaded player:slides:init", function(){
        $this.render();
    });


    $this.render();

    return $this;
});
