/* 
 MODULE: ERROR DISPLAY
 Display errors, including information when video is not supported
 
 Answers properties:
 - errors [get/set]

 Listens for:
 - player:video:displaydevice
*/

Player.provide('error-display', 
  {}, 
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);
    $this.render();
    
    Player.bind('player:video:displaydevice', function(e){
        $this.render();
      });

    $this.errorMessage = "";
    Player.setter('error', function(errorMessage){
        $this.errorMessage = errorMessage;
        $this.render();
      });
    Player.getter('error', function(){
        return $this.errorMessage;
      });
    return $this;
  }
          
);
