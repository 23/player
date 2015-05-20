/*
  MODULE: slides

  Provides functionality for loading and displaying slides

  Fires events:

  - player:slides:init
  - player:slides:loaded
  - player:slides:modechange
  - player:slides:overviewchange

  Answers properties:

  - slides [get]
  - showSlides [get]
  - hasSlides [get]
  - slideOverviewAvailable [get]
  - slideOverviewShown [get/set]
  - slideMode [set]
  - switchSlideMode [set]
  - playFromSlide [set]

*/

Player.provide('slides',{
    showSlides: true,
    defaultSlideMode: "pip-video",
    verticalPadding:0,
    horizontalPadding:0
},function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);

    Player.bind('player:settings', function(){
      PlayerUtilities.mergeSettings($this, ['showSlides', 'defaultSlideMode', 'verticalPadding', 'horizontalPadding']);
      Player.set("slideMode", $this.defaultSlideMode);
    });

    $this.slideUpdateInterval = 8000;
    $this.slideUpdateIntervalId = 0;
    $this.slides = [];
    $this.currentSlide = {
        deck_slide_id: ''
    };
    $this.queuedSlideMode = "";
    $this.slideOverviewShown = false;

    Player.getter('slides', function(){return $this.slides;});
    Player.getter('showSlides', function(){return $this.showSlides;});
    Player.getter('hasSlides', function(){
        return $this.slides.length > 0;
    });

    // The slide overview should be available if the video or stream has slides and slides is enabled in player settings
    // For streams, the slide overview only makes sense if the stream has dvr
    Player.getter('slideOverviewAvailable', function(){
        var ret = $this.showSlides && Player.get("hasSlides");
        var v = Player.get("video");
        if(v && v.type == "stream"){
            ret = ret && Player.get("stream_has_dvr");
        }
        return ret;
    });
    Player.getter('slideOverviewShown', function(){return $this.slideOverviewShown;});
    Player.getter('slideMode', function(){return $this.slideMode;});


    // Setter for switching between the different modes of displaying slides
    // Available modes: sbs-slide, sbs-video, pip-slide, pip-video, no-slides
    Player.setter("slideMode", function(mode){
        // If there is no slide to display, switch to "no-slides" and queue up the slide mode
        // The queued slide mode will be restored by updateSlides() when there is a slide to display
        if(mode != "no-slides" && $this.currentSlide.deck_slide_id == ''){
            $this.queuedSlideMode = mode;
            mode = "no-slides";
        }

        // Don't do anything, if we are already in the requested mode
        if(typeof $this.slideMode != "undefined" && $this.slideMode == mode) return;

        $this.slideMode = mode;

        if($this.slideModeDisabled) return;

        // Set correct body-classes so slides and video is sized and positioned correctly
        $this.setBodyClasses(mode);


        Player.fire("player:slides:modechange", $this.slideMode);
        $this.resize();
    });

    // Setter for switiching between pip-slide and pip-video
    Player.setter('switchSlideMode', function(value){
        switch($this.slideMode){
            case "pip-video":
                Player.set("slideMode", "pip-slide");
                break;
            case "pip-slide":
                Player.set("slideMode", "pip-video");
                break;
        }
    });

    Player.setter("slideModeDisabled", function(disabled){
        $this.slideModeDisabled = disabled;
        if(disabled){
            $this.setBodyClasses("no-slides");
        }else{
            $this.setBodyClasses($this.slideMode);
        }
    });

    Player.setter('slideOverviewShown', function(value){
        $this.slideOverviewShown = value;
        $this.render(function(){
            if($this.slideOverviewShown){
                $this.container.find(".slide-overview-container-background").css({
                    opacity: 0.7
                });
                Player.set("showSharing", false);
                Player.set("browseMode", false);
                Player.set("showDescriptions", false);
            }
            $this.updateCurrentSlide();
        });
        Player.fire("player:slides:overviewchange");
    });

    Player.setter("playFromSlide", function(index){
        var v = Player.get("video");
        if(v && v.type == "clip"){
            Player.set("currentTime", parseInt($this.slides[index].second));
        }else{
            var ct = Player.get("currentTime");
            var streamStartDate = (Player.get("videoElement").getProgramDate()/1000)-ct;
            Player.set("currentTime", parseInt($this.slides[index].absolute_time_epoch)-streamStartDate);
        }
        Player.set("playing", true);
        Player.set("slideOverviewShown", false);
    });

    // Resets intervals for loading slides
    $this.initSlides = function(v){
        window.clearInterval($this.slideUpdateIntervalId);
        if ($this.showSlides){
            if(v.type=="clip"){
                $this.loadSlides(v);
            }else if(v.type=="stream"){
                $this.loadSlides(v);
                $this.slideUpdateIntervalId = window.setInterval(function(){
                    $this.loadSlides(v);
                },$this.slideUpdateInterval);
            }
        }
        Player.fire("player:slides:init");
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
            Player.set("slideMode", $this.slideMode);
        }else if($this.currentSlide.deck_slide_id != slideToShow.deck_slide_id){
            // Update the current slide and possibly restore slide mode
            $this.currentSlide = slideToShow;
            $this.updateCurrentSlide();
            if($this.queuedSlideMode != ""){
              Player.set("slideMode", $this.queuedSlideMode);
              $this.queuedSlideMode = "";
            }
        }
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
        }).attr("src", Player.get("url")+$this.currentSlide.slide_url).prependTo($this.container.find(".slide-container td"));
    }

    $this.setBodyClasses = function(mode){
        $("body").removeClass("pip pip-slide pip-video sbs sbs-slide sbs-video no-slides");
        if(mode == "no-slides"){
            $("body").addClass("no-slides");
        }else if(mode == "sbs-slide" || mode == "sbs-video") {
            $("body").addClass("sbs "+mode);
        }else if(mode == "pip-slide" || mode == "pip-video") {
            $("body").addClass("pip "+mode);
        }
        if(/MSIE/.test(navigator.userAgent)){
            $(".video-display").hide(0, function(){$(this).show();});
        }
    };

    Player.bind("player:video:timeupdate player:slides:loaded",function(){
        if($this.showSlides){
            $this.updateSlides();
        }
    });

    // When a video is loaded, init and update the display of slides
    var last_id = 0;
    Player.bind("player:video:loaded player:protection:verified",function(e,v){
        if(v && (last_id==v.photo_id||last_id==v.live_id) && e!="player:protection:verified"){
            $this.updateCurrentSlide();
        }else if(v){
            last_id = (v.photo_id?v.photo_id:v.live_id);
            $this.initSlides(v);
        }
    });

    $this.resize = function(){
      // Set max-height slide img manually whenever the slide has a "100%-height" container
      var slide = $("body.sbs .slide-container img, body.pip-slide .slide-container img");
      if(slide.size()>0) {
        slide.css("max-height", $(".slide-container").get(0).clientHeight);
      }
      if($this.slideMode == "sbs-slide" || $this.slideMode == "sbs-video") {
        $('.slide-container table td').css({paddingBottom:$this.verticalPadding+'px', paddingRight:$this.horizontalPadding+'px'})
      } else {
        $('.slide-container table td').css({paddingBottom:'', paddingRight:''})
      }
    };
    $(window).resize($this.resize);

    $this.render();

    return $this;
});
