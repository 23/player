/*
 MODULE: PLAY BUTTON
 Show a play/pause button

 Listens for:
 - player:video:play
 - player:video:playing
 - player:video:pause
 - player:video:ended
*/

Player.provide('play-button',
  {},
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);

    // Get references to elements for updating later
    $this.render(function(){
        $this.button = $this.container.find("button");
        $this.buttonText = $this.button.find(".hide-visually");
    });

    // Update class and text
    var _buttonClass = "", _labelText = "";
    Player.bind('player:video:play player:video:seeked player:video:pause player:video:ended player:playflow:transitioned', function(e){
        if(!$this.button) return;
        $this.button.removeClass("play-button pause-button stop-button replay-button");
        if(Player.get("playing")){
            _labelText = Player.translate("pause_video");
            _labelTextAria = Player.translate("pause_video_aria");
            if(Player.get("isStream")){
                _buttonClass = "stop-button";
            }else{
                _buttonClass = "pause-button";
            }
        }else{
            if(Player.get("playflowPosition") != 5){
                _labelText = Player.translate("play_video");
                _labelTextAria = Player.translate("play_video_aria");
                _buttonClass = "play-button";
            }else{
                _labelText = Player.translate("replay_video");
                _labelTextAria = Player.translate("replay_video_aria");
                _buttonClass = "replay-button";
            }
        }
        $this.button.addClass(_buttonClass);
        $this.button.attr({
            "aria-label": _labelTextAria,
            "label": _labelText
        });
        $this.buttonText.text(_labelText);
    });

    return $this;
  }

);

/* Translations for this module */
Player.translate("play_video",{
    en: "Play video"
});
Player.translate("pause_video",{
    en: "Pause video"
});
Player.translate("replay_video", {
    en: "Replay video",
});
Player.translate("play_video_aria",{
    en: "The video is paused. Press enter or space to play the video"
});
Player.translate("pause_video_aria",{
    en: "The video is playing. Press enter or space to pause video"
});
Player.translate("replay_video_aria", {
    en: "The video has ended. Press enter or space to play it again.",
});
