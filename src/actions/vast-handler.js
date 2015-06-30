window.VastHandler = function(videoActionHandler){

    $this = this;

    $this.initAd = function(action, callback){
        $this.action = action;
        $this.callback = callback;

        $this.action.events = [];
        $this.action.reportedEvents = [];

        // Chrome throws an error when an https-url is requested through an ajax-call on a http-page,
        // but the error handler is never called. In that event, we choose to skip the ad.
        if( Player.get("protocol")=="https" && !/^https/.test($this.action.ad_url) ){
            $this.callback(false);
            return;
        }

        if(typeof $this.action.pendingData != "undefined"){
            var data = $this.action.pendingData;
            delete $this.action.pendingData;
            $this.parseVastResponse(data);
        }else{
            $this.loadAd();
        }
    };

    $this.loadAd = function(){
        // Replace instances of "[timestamp]" / "[random]" and "[referrer]"
        // with actual timestamp and referrer values
        $this.action.ad_url_replaced = $this.action.ad_url.replace(/\[timestamp\]|\[random\]/g, (new Date()).getTime()).replace(/\[referrer\]/g, document.referrer);
        $.ajax({
            url: $.trim($this.action.ad_url_replaced)||"fail",
            method: "GET",
            dataType: "xml",
            cache: false,
            xhrFields: {
                withCredentials: true
            },
            success: function(data){
                $this.parseVastResponse(data);
            },
            error: function(data){
                $this.callback(false);
            }
        });
    };

    $this.parseVastResponse = function(data){
        // Check for correct version of VAST
        var VAST = $(data).find("VAST");
        if (VAST.length < 1 || (VAST.attr("version") != "2.0" && VAST.attr("version") != "2.0.1")) {
            return $this.callback(false);
        }

        // Check if feed contains an ad
        var ads = VAST.find("Ad");
        var adIndex = $this.action.adIndex || 0;
        if (ads.eq(adIndex).length < 1) {
            return $this.callback(false);
        }

        // Possibly queue up the next ad
        if (ads.eq(adIndex+1).length > 0) {
            videoActionHandler.insertAction($.extend({
                "pendingData": data,
                "adIndex": adIndex+1
            }, $this.action));
        }

        // Select ad to display
        var ad = ads.eq(adIndex);
        var inline = ad.find("InLine").eq(0);

        // Check if feed is a wrapper
        var wrapper = ad.find("Wrapper VASTAdTagURI").eq(0);
        var isWrapper = false;
        if (wrapper.length > 0) {
            isWrapper = true;
        }else {
            if($this.action.type == "ad"){
                // Check if ad contains a video of type 'video/mp4'
                var adVideoUrl = inline.find("Creative Linear MediaFile[type='video/mp4']").eq(0);
                if (adVideoUrl.length < 1) {
                    return $this.callback(false);
                }
                $this.action.video = $.trim(adVideoUrl.text());
            }else if($this.action.type == "banner"){
                var adBannerUrl = inline.find("Creative NonLinear StaticResource").eq(0);
                if(adBannerUrl.length < 1){
                    return $this.callback(false);
                }
                $this.action.image = $.trim(adBannerUrl.text());
            }
        }

        // Playback events to be tracked and reported
        if (typeof $this.action.events == "undefined") $this.action.events = [];
        var impressions = ad.find("Impression");
        $.each(impressions, function(i,impression){
            if($(impression).text()!=""){
                $this.action.events.push({
                    "name": "impression",
                    "url": $.trim($(impression).text())
                });
            }
        });
        if($this.action.type == "ad"){
            var trackingevents = ad.find("Creative Linear").eq(0).find("TrackingEvents Tracking");
        }else if($this.action.type == "banner"){
            var trackingevents = ad.find("Creative NonLinearAds").eq(0).find("TrackingEvents Tracking");
        }
        $.each(trackingevents, function(i, event){
            var $event = $(event);
            if ($event.text()!=""){
                $this.action.events.push({
                    "name": $event.attr("event"),
                    "url": $.trim($event.text())
                });
            }
        });

        if($this.action.type == "ad"){
            var clickthrough = ad.find("Creative Linear").eq(0).find("VideoClicks ClickThrough").eq(0);
        }else if($this.action.type == "banner"){
            var clickthrough = ad.find("Creative NonLinear").eq(0).find("NonLinearClickThrough").eq(0);
        }
        if(clickthrough.length>0) $this.action.link = $.trim(clickthrough.text());

        if($this.action.type == "ad"){
            var clicktracking = ad.find("Creative Linear").eq(0).find("VideoClicks ClickTracking");
            $.each(clicktracking,function(i, trackinguri){
                var $trackinguri = $(trackinguri);
                if($trackinguri.text()!=""){
                    $this.action.events.push({
                        "name": "ClickTracking",
                        "url": $.trim($trackinguri.text())
                    });
                }
            });
        }

        // If this is a wrapper, request next url
        if (isWrapper) {
            $.ajax({
                url: $.trim(wrapper.text()),
                method: "GET",
                dataType: "xml",
                cache: false,
                xhrFields: {
                    withCredentials: true
                },
                success: function(data){
                    $this.parseVastResponse(data);
                },
                error: function(data){
                    $this.callback(false);
                }
            });
        } else {
            // The ad is loaded, initiate playback for it again
            $this.callback(true);
        }
    };

    // Create dictionary of supported events to report
    $this.eventHandlers = {};
    $this.eventHandlers["play"] = function(){
        $this.reportEvent("impression", true);
        $this.reportEvent("creativeView", true);
        $this.reportEvent("start", true);
        if (Player.get("fullscreen")) {$this.reportEvent("fullscreen", true);}
        $this.lastVolume = Player.get("volume");
        if ($this.lastVolume == 0) {$this.reportEvent("mute", true);}
    };
    $this.eventHandlers["pause"] = function(){
        var remaining = Player.get("duration") - Player.get("currentTime");
        if (remaining > 1) {
            $this.reportEvent("pause", false);
        }
    };
    $this.eventHandlers["ended"] = function(){
        $this.reportEvent("complete");
    };
    $this.eventHandlers["timeupdate"] = function(){
        var playthrough = Player.get("currentTime") / Player.get("duration");
        if (playthrough > 0.75) {
            $this.reportEvent("thirdQuartile", true);
        } else if (playthrough > 0.5) {
            $this.reportEvent("midpoint", true);
        } else if (playthrough > 0.25) {
            $this.reportEvent("firstQuartile", true);
        }
    };
    $this.eventHandlers["volumechange"] = function(){
        var currentVolume = Player.get("volume");
        if ($this.lastVolume == 0 && currentVolume != 0) {
            $this.reportEvent("unmute", false);
        } else if ($this.lastVolume != 0 && currentVolume == 0) {
            $this.reportEvent("mute", false);
        }
        $this.lastVolume = currentVolume;
    };
    $this.eventHandlers["enterfullscreen"] = function(){
        $this.reportEvent("fullscreen", true);
        $this.reportEvent("expand", false);
    };
    $this.eventHandlers["leavefullscreen"] = function(){
        $this.reportEvent("collapse", false);
    };
    $this.eventHandlers["click"] = function(){
        $this.reportEvent("ClickTracking", false);
    };
    $this.eventHandlers["close"] = function(){
        $this.reportEvent("close", false);
    };

    $this.reportEvent = function(event, once){
        var reported = false;
        if(once){
            $.each($this.action.reportedEvents, function(i,e){
                if(e==event) reported = true;
            });
        }

        // If 'start' is already reported, report 'resume' instead
        if(event=='start' && reported){
            event = 'resume';
            once = false;
        }

        if(!reported || !once){
            $.each($this.action.events, function(i,e){
                if(e.name==event) {
                    $this.ajaxReport(e.url);
                }
            });
            $this.action.reportedEvents.push(event);
        }
    };

    $this.ajaxReport = function(url){
        $.ajax({
            url: url,
            dataType: "eventReport",
            xhrFields: {
                withCredentials: true
            }
        });
    };

};

// Enable cross domain ajax calls in IE8+9
(function(){
    // jQuery.XDomainRequest.js
    // Author: Jason Moon - @JSONMOON
    // IE8+
    if (!jQuery.support.cors && jQuery.ajaxTransport && window.XDomainRequest) {
        var httpRegEx = /^https?:\/\//i;
        var getOrPostRegEx = /^get|post$/i;
        var sameSchemeRegEx = new RegExp('^'+location.protocol, 'i');
        var htmlRegEx = /text\/html/i;
        var jsonRegEx = /\/json/i;
        var xmlRegEx = /\/xml/i;

        // ajaxTransport exists in jQuery 1.5+
        jQuery.ajaxTransport('text html xml json', function(options, userOptions, jqXHR){
            // XDomainRequests must be: asynchronous, GET or POST methods, HTTP or HTTPS protocol, and same scheme as calling page
            if (options.crossDomain && options.async && getOrPostRegEx.test(options.type) && httpRegEx.test(options.url) && sameSchemeRegEx.test(options.url)) {
                var xdr = null;
                var userType = (userOptions.dataType||'').toLowerCase();
                return {
                    send: function(headers, complete){
                        xdr = new XDomainRequest();
                        if (/^\d+$/.test(userOptions.timeout)) {
                            xdr.timeout = userOptions.timeout;
                        }
                        xdr.ontimeout = function(){
                            complete(500, 'timeout');
                        };
                        xdr.onload = function(){
                            var allResponseHeaders = 'Content-Length: ' + xdr.responseText.length + '\r\nContent-Type: ' + xdr.contentType;
                            var status = {
                                code: 200,
                                message: 'success'
                            };
                            var responses = {
                                text: xdr.responseText
                            };
                            try {
                                if (userType === 'html' || htmlRegEx.test(xdr.contentType)) {
                                    responses.html = xdr.responseText;
                                } else if (userType === 'json' || (userType !== 'text' && jsonRegEx.test(xdr.contentType))) {
                                    try {
                                        responses.json = jQuery.parseJSON(xdr.responseText);
                                    } catch(e) {
                                        status.code = 500;
                                        status.message = 'parseerror';
                                        //throw 'Invalid JSON: ' + xdr.responseText;
                                    }
                                } else if (userType === 'xml' || (userType !== 'text' && xmlRegEx.test(xdr.contentType))) {
                                    var doc = new ActiveXObject('Microsoft.XMLDOM');
                                    doc.async = false;
                                    try {
                                        doc.loadXML(xdr.responseText);
                                    } catch(e) {
                                        doc = undefined;
                                    }
                                    if (!doc || !doc.documentElement || doc.getElementsByTagName('parsererror').length) {
                                        status.code = 500;
                                        status.message = 'parseerror';
                                        throw 'Invalid XML: ' + xdr.responseText;
                                    }
                                    responses.xml = doc;
                                }
                            } catch(parseMessage) {
                                throw parseMessage;
                            } finally {
                                complete(status.code, status.message, responses, allResponseHeaders);
                            }
                        };
                        // set an empty handler for 'onprogress' so requests don't get aborted
                        xdr.onprogress = function(){};
                        xdr.onerror = function(){
                            complete(500, 'error', {
                                text: xdr.responseText
                            });
                        };
                        var postData = '';
                        if (userOptions.data) {
                            postData = (jQuery.type(userOptions.data) === 'string') ? userOptions.data : jQuery.param(userOptions.data);
                        }
                        xdr.open(options.type, options.url);
                        xdr.send(postData);
                    },
                    abort: function(){
                        if (xdr) {
                            xdr.abort();
                        }
                    }
                };
            }
        });
    }
})();

// Register custom transport type for reporting events
// Used for simply requesting a cross domain url and ignoring whether the request succeeds or fails
$.ajaxTransport( "eventReport", function( s ) {
    if ( s.type === "GET" && s.async ) {
        var image;
        return {
            send: function( _ , callback ) {
                image = new Image();
                function done( status ) {
                    if ( image ) {
                        var statusText = ( status === 200 ) ? "success" : "error",
                            tmp = image;
                        image = image.onreadystatechange = image.onerror = image.onload = null;
                        callback( status, statusText, { image: tmp } );
                    }
                }
                image.onreadystatechange = image.onload = function() {
                    done( 200 );
                };
                image.onerror = function() {
                    done( 404 );
                };
                image.src = s.url;
            },
            abort: function() {
                if ( image ) {
                    image = image.onreadystatechange = image.onerror = image.onload = null;
                }
            }
        };
    }
});
