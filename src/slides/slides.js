/*
  MODULE: slides

  Provides functionality for loading and displaying slides

  Fires events:

  - player:slides:init
  - player:slides:loaded
  - player:slides:modechange

  Answers properties:

  - slides [get]
  - hasSlides [get]
  - slideMode [set]

*/

Player.provide('slides',{
    slideMode: "slidemode-sbs",
    verticalPadding:0,
    horizontalPadding:0
},function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);

    Player.bind('player:settings', function(){
      PlayerUtilities.mergeSettings($this, ['slideMode', 'verticalPadding', 'horizontalPadding']);
      $this.killSlides();  
      Player.set("slideMode", $this.slideMode);
    });

    $this.slideUpdateInterval = 8000;
    $this.slideUpdateIntervalId = 0;
    $this.slides = [];
    $this.currentSlide = {
        deck_slide_id: ''
    };

    Player.getter('slides', function(){return $this.slides;});
    Player.getter('showSlides', function(){return $this.showSlides;});
    Player.getter('hasSlides', function(){
        return $this.slides.length > 0;
    });
    Player.getter('slideMode', function(){return $this.slideMode;});
    Player.getter('slideModes', function(){
        return [{
            key: "slidemode-sbs",
            display: "Side by side"
        }, {
            key: "slidemode-video",
            display: "Video only"
        }, {
            key: "slidemode-slide",
            display: "Slides only"
        }];
    });

    // Setter for switching between the different modes of displaying slides
    // Available modes: sbs-slide, sbs-video, pip-slide, pip-video, no-slides
    Player.setter("slideMode", function(mode){
        $this.slideMode = mode;

        // Set correct body-classes so slides and video is sized and positioned correctly
        $this.setBodyClasses(mode);

        Player.fire("player:slides:modechange", $this.slideMode);
        $this.resize();
    });

    // Resets intervals for loading slides
    $this.initSlides = function(v){
        window.clearInterval($this.slideUpdateIntervalId);
        $this.loadSlides(v);
        if(v.type=="stream"){
            $this.slideUpdateIntervalId = window.setInterval(function(){
                $this.loadSlides(v);
            },$this.slideUpdateInterval);
        }
        Player.fire("player:slides:init");
    };

    $this.killSlides = function(){
        window.clearInterval($this.slideUpdateIntervalId);
        $("body").addClass("no-slides");
        Player.fire("player:slides:kill");
    };

    // Fetches slide info from the api
    $this.loadSlides = function(video){
        var idTokenObject = {};
        var v = video||Player.get("video");
        if(v.type=="clip"){
            idTokenObject = {photo_id: v.photo_id};
        }else{
            idTokenObject = {live_id: v.live_id};
        }
        if(typeof(v.has_deck_p)!='undefined' && v.has_deck_p) {
          idTokenObject['token'] = v.token;
          Player.get('api').deck.timeline.listSlides(idTokenObject,function(res){
            $this.slides = res.decktimelineslides;
            Player.fire("player:slides:loaded");
          },function(res){
            $this.slides = [];
            Player.fire("player:slides:loaded");
          });
        } else {
          $this.slides = [];
          Player.fire("player:slides:loaded");
        }
    };

    // Runs through the slides array and figures out which slide to show
    $this.updateSlides = function(){
        var slideToShow = null;
        if(!Player.get("video")) return;
        if(Player.get("video").type=="clip"){
            var ct = Player.get("currentTime");
            $.each($this.slides,function(i,slide){
                if(slide.second<=ct){
                    slideToShow = slide;
                }else{
                    return false;
                }
            });
        }else{
            var cat = parseInt(Player.get("videoElement").getProgramDate()/1000);
            $.each($this.slides,function(i,slide){
                if(parseInt(slide.absolute_time_epoch)<=cat){
                    slideToShow = slide;
                }else{
                    return false;
                }
            });
        }

        if(slideToShow == null || slideToShow.deck_slide_id==''){
            // If we do not have a slide to show, disable slide display temporarily
            $this.container.find(".slide-container img").remove();
            $this.currentSlide = {deck_slide_id: ''};
            $("body").addClass("no-slides");
        }else if($this.currentSlide.deck_slide_id != slideToShow.deck_slide_id){
            // Update the current slide and possibly restore slide mode
            $this.currentSlide = slideToShow;
            $this.updateCurrentSlide();
            $("body").removeClass("no-slides");
        }
        $this.resize();
    };

    // Updates the slide that is currently displayed
    $this.updateCurrentSlide = function(){
        if (!$this.currentSlide.slide_url) return;
        var currentImg = $this.container.find(".slide-container img");
        var nextImg = $("<img/>");
        nextImg.hide().load(function(){
            if(currentImg.size()>0){
                currentImg.remove();
            }
            nextImg.show();
        }).attr({
            "src": Player.get("url")+$this.currentSlide.slide_url
        }).click(function(){
            Player.set("slideMode", ($this.slideMode == "slidemode-sbs" ? "slidemode-slide" : "slidemode-sbs"));
        }).prependTo( $this.container.find(".slide-container td") );
    };

    $this.setBodyClasses = function(mode){
        $("body").removeClass("slidemode-sbs slidemode-video slidemode-slide");
        $("body").addClass(mode);
        if(/MSIE/.test(navigator.userAgent)){
            $(".video-display").hide(0, function(){$(this).show();});
        }
    };

    Player.bind("player:video:timeupdate player:slides:loaded",function(){
        $this.updateSlides();
    });

    // When a video is loaded, init and update the display of slides
    Player.bind("player:playflow:transitioned",function(e,transition){
        if(transition.currentPosition == 3){
            $this.initSlides( Player.get("video") );
        }else{
            $this.killSlides();
        }
    });

    $this.resize = function(){
      // Set max-height slide img manually whenever the slide has a "100%-height" container
      var slide = $(".slide-container img");
      if(slide.size()>0) {
        slide.css("max-height", $(".slide-container").get(0).clientHeight);
      }
      if($this.slideMode == "slidemode-slide" || $this.slideMode == "slidemode-sbs") {
        $('.slide-container table td').css({paddingBottom:$this.verticalPadding+'px', paddingRight:$this.horizontalPadding+'px'});
      } else {
        $('.slide-container table td').css({paddingBottom:'', paddingRight:''});
      }
    };
    $(window).resize($this.resize);
    Player.bind("player:slides:modechange", $this.resize);

    $this.render();

    return $this;
});
