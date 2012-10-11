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


    Player.setter('shiftQuality', function(d){
        var a = Player.get('qualitiesArray');
        var q = Player.get('quality');
        var index = 0;
        $.each(a, function(i,x){
            if(x.quality==q) index = i;
          });
        if(a[index+1]){
          Player.set('quality', a[index+1].quality);
        } else {
          Player.set('quality', a[0].quality);
        }
      });
      
    return $this;
  }
);
