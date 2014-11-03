/*
  MODULE: slides

  Provides functionality for loading and displaying slides

*/

Player.provide('slides',{
    showSlides: true,
    slideUpdateInterval: 8000,
    defaultSlideMode: "pip-video"
},function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);

    Player.bind('player:settings', function(){
      PlayerUtilities.mergeSettings($this, ['showSlides', 'defaultSlideMode']);
      Player.set("slideMode", $this.defaultSlideMode);
    });

    $this.slideUpdateIntervalId = 0;
    $this.slides = [];
    $this.currentSlide = {
        deck_slides_id: 0
    };
    $this.queuedSlideMode = "";
    $this.slideOverviewShown = false;

    Player.getter('currentSlideUrl', function(){
        return $this.currentSlide.slide_url;
    });
    Player.getter('slides', function(){
        return $this.slides;
    });
    Player.getter('showSlides', function(){return $this.showSlides;});
    Player.getter('hasSlides', function(){
        return $this.slides.length > 0;
    });

    $this.initSlides = function(v){
        window.clearInterval($this.slideUpdateIntervalId);
        if ($this.showSlides){
            if(v.type=="clip"){
                $this.loadSlides();
            }else if(v.type=="stream"){
                $this.loadSlides();
                $this.slideUpdateIntervalId = window.setInterval(function(){
                    $this.loadSlides();
                },$this.slideUpdateInterval);
            }
        }
        Player.fire("player:slides:init");
    };

    $this.loadSlides = function(){
        var idTokenObject = {};
        var v = Player.get("video");
        if(v.type=="clip"){
            idTokenObject = {photo_id: v.photo_id};
        }else{
            idTokenObject = {live_id: v.live_id};
        }
        idTokenObject['token'] = v.token;
        Player.get('api').deck.timeline.listSlides(idTokenObject,function(res){
            $this.slides = res.decktimelineslides;
            Player.fire("player:slides:loaded");
        },function(res){
            Player.fire("player:slides:loaded");
        });
    };


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
        if(slideToShow == null){
            // If we do not have a slide to show, disable slide display temporarily and remember current slide mode
            $this.queuedSlideMode = ($this.slideMode != "no-slides" ? $this.slideMode : $this.queuedSlideMode);
            Player.set("slideMode", "no-slides");
            $this.container.find(".slide-container img").remove();
            return;
        }
        if($this.currentSlide.deck_slide_id != slideToShow.deck_slide_id){
            // Update the current slide and possibly restore slide mode
            $this.currentSlide = slideToShow;
            $this.updateCurrentSlide();
            if($this.queuedSlideMode != ""){
              Player.set("slideMode", $this.queuedSlideMode);
              $this.queuedSlideMode = "";
            }
        }
    };

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

    $this.resize = function(){
        // If in side-by-side mode, fix sizing of slide
        var slide = $("body.sbs .slide-container img, body.pip-slide .slide-container img");
        if(slide.size()>0){
            slide.css("max-height", $("body").height());
        }
    };
    $(window).resize($this.resize);

    Player.setter("slideMode", function(mode){ // mode: sbs-slide, sbs-video, pip-slide, pip-video, no-slides
        if(typeof $this.slideMode != "undefined" && $this.slideMode == mode) return;
        $this.slideMode = mode;
        $("body").removeClass("pip pip-slide pip-video sbs sbs-slide sbs-video no-slides");
        if(mode == "sbs-slide" || mode == "sbs-video") {
            $("body").addClass("sbs "+mode);
        }else if(mode == "pip-slide" || mode == "pip-video") {
            $("body").addClass("pip "+mode);
        }else if(mode == "no-slides"){
            $("body").addClass(mode);
        }
        Player.fire("player:slides:modechange");
        $this.resize();
    });
    Player.set("slideMode", "no-slides");
    Player.setter('switchSlideMode', function(value){
        switch($this.slideMode){
            case "pip-video":
                Player.set("slideMode", "pip-slide");
                break;
            case "pip-slide":
                Player.set("slideMode", "pip-video");
                break;
            case "sbs-video":
                Player.set("slideMode", "sbs-slide");
                break;
            case "sbs-slide":
                Player.set("slideMode", "sbs-video");
                break;
        }
    });

    // When a video is loaded, remove currently shown slide and init new slides
    var last_id = 0;
    Player.bind("player:video:loaded",function(e,v){
        if(v && (last_id==v.photo_id||last_id==v.live_id)){
            $this.updateCurrentSlide();
        }else if(v && typeof Player.get("videoElement") != "undefined"){
            last_id = (v.photo_id?v.photo_id:v.live_id);
            $this.initSlides(v);
        }
    });

    Player.bind("player:video:timeupdate player:slides:loaded",function(){
        if($this.showSlides){
            $this.updateSlides();
        }
    });

    Player.getter('slideOverviewAvailable', function(){
        var ret = $this.showSlides && Player.get("hasSlides");
        var v = Player.get("video");
        if(v && v.type == "stream"){
            ret = ret && Player.get("stream_has_dvr");
        }
        return ret;
    });
    Player.getter('slideOverviewShown', function(){return $this.slideOverviewShown;});
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

    $this.render();

    return $this;
});
