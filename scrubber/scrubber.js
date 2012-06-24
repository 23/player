/* 
  MODULE: SRUBBER
  Show time line for the video currently being played.

  Listens for:
  -
*/

Glue.provide('scrubber', 
  {
    className:'tray-scrubber'
  },
  function(Glue,$,opts){
      var $this = this;
      $.extend($this, opts);
     
      return $this;
  }
);
