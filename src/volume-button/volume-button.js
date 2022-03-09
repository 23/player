/* 
 MODULE: VOLUME/MUTE BUTTON
 Show a mute/sound button
 
 Listens for:
 - player:video:volumechange
*/

Player.provide('volume-button', 
  {}, 
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);

    Player.bind("player:video:ready", function(){
        if (!/iPad|iPhone|Android/.test(navigator.userAgent)) {
            $this.render(function(){
                $this.buttonContainer = $this.container.find(".button-container");
                $this.button = $this.buttonContainer.find("button");
                $this.volumeContainer = $this.container.find(".volume-slider");
                $this.volumeSlider = $this.container.find(".volume-slider-inner");
                $this.volumeLevel = $this.volumeSlider.find(".volume-level");
                $this.initVolumeSlider();
            });
        }
    });

    var _buttonClass = "";
    Player.bind('player:video:volumechange player:video:play player:video:pause player:video:loaded', function(e){
        if(typeof $this.button == "undefined" || !$this.button.length) return;
        $this.button.removeClass("volume-button-on volume-button-off");
        if(Player.get("volumeMuted")){
            _buttonClass = "volume-button-off";
        }else{
            _buttonClass = "volume-button-on";
        }
        $this.button.addClass(_buttonClass);
        $this.updateVolumeSlider();
    });

    var _dragging = false;
    $this.initVolumeSlider = function(){
        if(!$this.volumeSlider.length) return;
        $this.button.on("mouseup", function(e){
            if(_dragging){
                e.preventDefault();
            }
        });
        $this.volumeSlider.on("click", function(e){
            e.stopPropagation();
        });
        $this.volumeSlider.on("mousedown", function(e){
            _dragging = true;
            $this.buttonContainer.addClass("button-container-active");
            $this.setVolumeFromEvent(e);
        });
        $(document).on("mouseup", function(e){
            _dragging = false;
            $this.buttonContainer.removeClass("button-container-active");
        });
        $(document).on("mousemove", function(e){
            if(_dragging){
                $this.setVolumeFromEvent(e);
            }
        });
        Player.fire("player:video:volumechange");
    };
    $this.setVolumeFromEvent = function(e){
        var offsetY = e.pageY - $this.volumeSlider.offset().top;
        var v = ($this.volumeSlider.height() - offsetY - 12) / ($this.volumeSlider.height()-24);
        Player.set("volume", v);
    };
    $this.updateVolumeSlider = function(){ 
      $this.volumeLevel.css({
        height: (Player.get("volume")*100)+"%"
      });
      $this.volumeContainer.attr("aria-valuetext", (Player.get("volume")*100)+"%")
    };
      
    return $this;
  }
          
);

/* Translations for this module */
Player.translate("toggle_volume",{
    en: "Toggle volume"
});
Player.translate("volume_slider",{
    en: "Volume slider"
});
