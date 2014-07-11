/*
  MODULE: slides

  Provides functionality for loading and displaying slides

*/

Player.provide('slides',{
    showSlides: true,
    slideUpdateInterval: 8000,
    slideSize: "corner"
},function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);

    $this.slideUpdateIntervalId = 0;
    $this.slides = [];
    $this.currentSlide = {
        deck_slides_id: 0
    };
    $this.streamOffset = 0;

    Player.getter('currentSlideUrl', function(){
        return $this.currentSlide.slide_url;
    });
    Player.getter('slides', function(){
        return $this.slides;
    });

    Player.setter('slideSize', function(size){
        switch(size){
            case "corner":
                $this.slideSize = size;
                $this.container.find(".slide-container").removeClass("full-container");
                break;
            case "full":
                $this.slideSize = size;
                $this.container.find(".slide-container").addClass("full-container");
                break;
            default:
                $this.slideSize = ($this.slideSize=="corner"?"full":"corner")
                Player.set("slideSize", $this.slideSize);
        }
    });


    $this.initSlides = function(v){
        $this.streamOffset = 0;
        window.clearInterval($this.slideUpdateIntervalId);
        if ($this.showSlides&&v.has_deck_p){
            if(v.type=="clip"){
                $this.loadSlides();
            }else if(v.type=="stream"){
                $this.loadSlides();
                $this.slideUpdateIntervalId = window.setInterval(function(){
                    $this.loadSlides();
                },$this.slideUpdateInterval);
            }
        }
    };

    $this.loadSlides = function(){
        var idObject = {};
        var v = Player.get("video");
        if(v.type=="clip"){
            idObject = {
                photo_id: v.photo_id
            };
        }else{
            idObject = {
                live_id: v.live_id
            };
        }
        Player.get('api').deck.timeline.listSlides($.extend(idObject,{
            token: v.token
        }),function(res){
            $this.slides = res.decktimelineslides;
            Player.fire("player:slides:slidesloaded");
        },function(res){
            console.log(res);
            $this.slides = [];
            Player.fire("player:slides:slidesloaded");
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
            if($this.streamOffset == 0){
                $this.calculateStreamOffset();
            }
            if(Player.get("videoElement").getProgramDate()>0){
                var cat = parseInt(Player.get("videoElement").getProgramDate()/1000);
            }else{
                var cat = $this.streamOffset + Player.get("currentTime");
            }
            $.each($this.slides,function(i,slide){
                if(parseInt(slide.absolute_time_epoch)<=cat){
                    slideToShow = slide;
                }else{
                    return false;
                }
            });
        }
        if(slideToShow == null){
            $this.container.find("img").remove();
            return;
        }
        if($this.currentSlide.deck_slide_id != slideToShow.deck_slide_id){
            $this.currentSlide = slideToShow;
            $this.updateCurrentSlide();
        }
    };

    $this.updateCurrentSlide = function(){
        var currentImg = $this.container.find("img");
        var nextImg = $("<img/>");
        nextImg.load(function(){
            if(currentImg.size()>0){
                currentImg.fadeOut(function(){
                    currentImg.remove();
                });
            }
        }).attr("src", Player.get("url")+$this.currentSlide.slide_url).prependTo($this.container.find(".slide-container"));
    }

    // Fallback method of syncing slides. Assumes a 22 second delay compared to real time
    $this.calculateStreamOffset = function(){
        if($this.slides.length==0||Player.get("currentTime")==0) return;
        var streamStartEpoch = parseInt($this.slides[0].absolute_time_epoch) - parseInt($this.slides[0].second);
        var zeroEpoch = ((new Date()).getTime() / 1000) - Player.get("currentTime") - 22;
        $this.streamOffset = zeroEpoch;
    };

    Player.bind("player:video:loaded",function(e,v){
        $this.container.find("img").remove();
        if(typeof v != "undefined" && typeof Player.get("videoElement") != "undefined"){
            Player.get("videoElement").setProgramDateHandling(true);
            $this.initSlides(v);
        }
    });

    Player.bind("player:video:timeupdate player:slides:slidesloaded",function(){
        if($this.showSlides){
            $this.updateSlides();
        }
    });

    $this.container.on("click", "img", function(){
        Player.set("slideSize");
    });

    $this.render();

    return $this;
});
