/* 
  MODULE: SECTIONS
  Show sections for the video

  Listens for:
  - player:video:loaded

   Fires:
   - player:sectionschange

   Answers properties:
   - sections [get]
   - sectionsArray [get]
*/

Player.provide('sections', 
  {},
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);
      $this.sections = [];

      // Load some list of available sections
      // Uses the /api/photo/section/list API endpoint
      Player.bind('player:video:loaded', function(e,v){
          Player.set('sections', []);
          if(typeof(v.sections_p)!='undefined' && v.sections_p) {
            Player.get('api').photo.section.list(
                {photo_id:Player.get('video_photo_id'), token:Player.get('video_token')},
                function(data){
                  Player.set('sections', data.sections);
                  Player.fire('player:sectionschange');
                },
                Player.fail
            );
          }
        });

      /* GETTERS */
      Player.getter('sections', function(){return $this.sections;});
      /* SETTERS */
      Player.setter('sections', function(s){
          $this.sections = [];
          var d = 1.0*Player.get('video_duration');
          $(s).each(function(i,sec){
              sec.start_time = sec.start_time*1.0;
              sec.position = 1.0*sec.start_time/d;
              sec.positionPct = (sec.position*100.0) + '%';
              $this.sections.push(sec);
          });
          $this.render(function(){
              $this.container.find(".section").each(function(i, section){
                  var $section = $(section);
                  $section.one("mouseenter", function(){
                      var $title = $section.find(".section-title");
                      $title.css({
                          left: $title.outerWidth() / -2
                      });
                  });
              });
          });
          Player.fire('player:sectionschange');
      });

      return $this;
  }
);
