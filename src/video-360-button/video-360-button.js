/*
  MODULE: VIDEO 360 BUTTON

  Toggles VR mode for 360 videos

*/

Player.provide("video-360-button",{
}, function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);

    Player.getter("displaying360", function(){
        return ThreeSixtyController.displaying360();
    });

    Player.setter("toggleVRMode",function() {
        ThreeSixtyController.toggleVR();
    });

    Player.bind("player:video:loaded", function() {
        $this.render();
    });
});
