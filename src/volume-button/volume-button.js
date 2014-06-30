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
    $this.videoVolume = null;
    $this.render(function(){
        updateVolumeIcon();
        $this.volumeHandle = $this.container.find('.volume-handle');

        /* Make volume-handle draggable */

        if($this.volumeHandle) {
          $this.volumeHandle.on('mousedown', function(e){
            // Enable dragging and different positioning of the volume handle
            $this.videoVolume = Player.get('volume'); 
            e.stopPropagation();
          });
          $(document).mousemove(function(e){
              if($this.videoVolume!==null) {
                  $this.volumeHandle = $this.container.find('.volume-handle');
                  $this.volumeFilled = $this.container.find('.volume-filled');
                  $this.volumeTrack = $this.container.find('.volume-track');

                  var trackTop = $this.volumeTrack.offset()['top'];
                  var trackHeight = $this.volumeTrack.height();
                  var volumeFilledHeight = Math.max(0, Math.min(trackHeight - (e.clientY-trackTop), trackHeight));
                  $this.volumeFilled.height(volumeFilledHeight);
                  $this.volumeHandle.css({bottom: (volumeFilledHeight+4)});
                  var volume = volumeFilledHeight / trackHeight;
                  Player.set('volume', volume);
              }
          });
          $(document).mouseup(function(e){
              if($this.videoVolume!==null) {
                  $this.videoVolume = null;
                  e.stopPropagation();
              }
          });
          $this.volumeHandle.on('click', function(e){
              // Clicks on the handle shouldn't bubble to clicks on the scrubber
              e.stopPropagation(); 
          });
          $('.volume-filled, .volume-track').click(function(e){
            console.debug(e);
          });
        }
    });

    var updateVolumeIcon = function(){
      $this.container.find('.volume-button')
        .removeClass('volume-button-on volume-button-off')
        .addClass(Player.get('volumeMuted') ? 'volume-button-on' : 'volume-button-off');
    }

    var volumeFromClientY = function(clientY) {
      if(clientY.clientY) clientY = clientY.clientY;
      var vol = ((clientY-$this.volumeTrack.offset().top-$this.volumeTrack.height())*-1) / $this.volumeTrack.height();
      Player.set('volume', vol);
    }

    var updateVolume = function() {
      var volume = Player.get('volume');
      $this.volumeHandle = $this.container.find('.volume-handle');
      $this.volumeFilled = $this.container.find('.volume-filled');
      $this.volumeTrack = $this.container.find('.volume-track');
      $this.volumeFilled.click(volumeFromClientY);
      $this.volumeTrack.click(volumeFromClientY);

      var volumeFilledHeight = (parseInt($this.volumeTrack.parent().css('height')) - 22) * volume;
      $this.volumeFilled.css({height: volumeFilledHeight});
      $this.volumeHandle.css({bottom: Math.max(volumeFilledHeight+4, 4)});

    }

    Player.bind('player:video:volumechange player:load', function(e){
        updateVolumeIcon();
        if($this.videoVolume==null) {
          updateVolume();
        }

      });

    Player.bind('player:video:loaded', function(e){
      // If volume change is not supported, rerender to hide volume button
      if (!Player.get('supportsVolumeChange')) {
        $this.render();
      }
    });

    Player.bind('player:volume-engaged', function(e){updateVolume();});

    /* GETTERS */
    Player.getter('volumeMuted', function(){return (Player.get('volume')==0);});
    /* SETTERS */
    Player.setter('volumeMuted', function(vm){
        Player.set('volume', (vm ? 0 : 1));
      });
      
    return $this;
  }
          
);

/* Translations for this module */
Player.translate("toggle_volume",{
    en: "Toogle volume"
});
