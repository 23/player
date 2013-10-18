/*
  MODULE: VAST

  This module is used to display video ads in players.

  This module supports linear video ads served in the VAST 2.0 format
  VAST specifikation: http://www.iab.net/media/file/VAST-2_0-FINAL.pdf

*/

Player.provide('vast',
  {
    active:false,
    url:""
  },
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);

    $this.vastState = 'before';
    $this.playerReady = true;
    $this.playableAds = [];
    $this.currentAdIndex = -1;
    $this.vastUrlCount = 0;

    // Wait for player settings to determine if we should show ads
    Player.bind('player:settings', function(e,settings){
      PlayerUtilities.mergeSettings($this, ['adsVastURL', 'adsShowPreroll', 'adsShowPostroll', 'adsShowCountdown', 'adsAllowClose', 'adsCountdownTextSingular', 'adsCountdownTextPlural']);
      if (typeof $this.adsCountdownTextSingular == "undefined" || $this.adsCountdownTextSingular == "") {
        $this.adsCountdownTextSingular = "This ad will end in % second";
      }
      if (typeof $this.adsCountdownTextPlural == "undefined" || $this.adsCountdownTextPlural == "") {
        $this.adsCountdownTextPlural = "This ad will end in % seconds";
      }
      if (typeof $this.adsVastURL != "undefined" && $this.adsVastURL != "") {
        Player.set("vastURL", $this.adsVastURL);
      }
    });

    // Fetches an xml document
    $this.init = function(url){
      $.ajax({
        url: url,
        dataType: "xml",
        success: $this.parseData,
        error: function(){
          $this.failLoadingXML();
        }
      });
    };
    // Check if we need to patch jQuery for <IE10
    checkIEAjaxFallback();

    $this.urlFromString = function(urlString){
      var url = urlString.match(/((http|https):\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/:;?%&=]*))/);
      if (url) {
        return url[0];
      } else {
        return "";
      }
    };

    $this.parseData = function(data){
      $this.dataParsed = true;
      $this.VAST = $(data).find("VAST");
      if ($this.VAST.length < 1 || ($this.VAST.attr("version") != "2.0" && $this.VAST.attr("version") != "2.0.1")) {
        $this.failLoadingXML();
        return;
      }
      $this.ads = $this.VAST.find("Ad");
      if ($this.ads.length < 1) {
        $this.failLoadingXML();
        return;
      }
      var adCount = $this.playableAds.length;
      $this.ads.each(function(){
        var ad = {};
        ad.impressions = [];
        $(this).find("InLine").eq(0).children("Impression").each(function(){
          ad.impressions.push($this.urlFromString($(this).text()));
        });
        var Linear = $(this).find("Linear").eq(0);
        ad.url = $this.urlFromString(Linear.find("MediaFile[type='video/mp4']").eq(0).text());
        ad.clickUrl = $this.urlFromString(Linear.find("ClickThrough").eq(0).text());
        ad.events = {};
        Linear.find("TrackingEvents Tracking").each(function(){
          var event = $(this).attr("event");
          var url = $this.urlFromString($(this).text());
          ad.events[event] = url;
        });
        if (ad.url != "") {
          $this.playableAds.push(ad);
        }
      });
      if (adCount == $this.playableAds.length) {
        $this.failLoadingXML();
        return;
      }
      if ($this.queuePlay) {$this.playNextAd();}
    };

    $this.failLoadingXML = function(){
      $this.vastUrlCount -= 1;
      if ($this.vastUrlCount == 0) {
        $this.active = false;
        if ($this.queuePlay) {
          $this.vastState = 'during';
          Player.set("playing", true);
        }
      }
    };

    $this.ajaxReport = function(url, event){
      $.ajax({
        url: url,
        success: function(){},
        error: function(){},
        dataType: "image"
      });
    };
    $this.reportedEvents = [];
    $this.reportEvent = function(event, checkReported){
      var reported = false;
      if (checkReported) {
        for (var i = 0; i < $this.reportedEvents.length; i += 1) {
          if ($this.reportedEvents[i] == event) {
            reported = true;
          }
        }
      }
      if (event == "impression" && !reported) {
        $.each($this.playableAds[$this.currentAdIndex].impressions, function(i,v){
          $this.ajaxReport(v, event);
        });
        $this.reportedEvents.push(event);
        return;
      }
      if (event == "start" && reported && Player.get("currentTime") > 1) {
        event = "resume";
        reported = false;
      }
      var events = $this.playableAds[$this.currentAdIndex].events;
      if (events[event] && !reported) {
        $this.ajaxReport(events[event], event);
      }
      $this.reportedEvents.push(event);
    };
    Player.bind("player:vast:play", function(){
      $this.reportEvent("impression", true);
      $this.reportEvent("creativeView", true);
      $this.reportEvent("start", true);
      if (Player.get("fullscreen")) {$this.reportEvent("fullscreen", true);}
      $this.lastVolume = Player.get("volume");
      if ($this.lastVolume) == 0) {$this.reportEvent("mute", true);}
    });
    Player.bind("player:vast:pause", function(){
      var remaining = Player.get("duration") - Player.get("currentTime");
      if (remaining > 1) {
        $this.reportEvent("pause", false);
      }
    });
    Player.bind("player:vast:ended", function(){$this.reportEvent("complete", true);});
    Player.bind("player:vast:timeupdate", function(){
      var playthrough = Player.get("currentTime") / Player.get("duration");
      if (playthrough > 0.75) {
        $this.reportEvent("thirdQuartile", true);
      } else if (playthrough > 0.5) {
        $this.reportEvent("midpoint", true);
      } else if (playthrough > 0.25) {
        $this.reportEvent("firstQuartile", true);
      }
    });
    Player.bind("player:vast:enterfullscreen", function(){
      $this.reportEvent("fullscreen", true);
      $this.reportEvent("expand", false);
    });
    Player.bind("player:vast:leavefullscreen", function(){
      $this.reportEvent("collapse");
    });
    Player.bind("player:vast:volumechange", function(){
      var currentVolume = Player.get("volume");
      if ($this.lastVolume == 0 && currentVolume != 0) {
        $this.reportEvent("unmute", false);
      } else if ($this.lastVolume != 0 && currentVolume == 0) {
        $this.reportEvent("mute", false);
      }
      $this.lastVolume = currentVolume;
    });

    // Logic to load the display device with Eingebaut
    $this.eingebaut = null;
    $this.originalEingebaut = {
      callback: null,
      source: null
    }
    $this.vastEingebautCallback = function(e){
      if (e == "ready") {
        $this.playerReady = true;
        if ($this.queuedUrl) {
          $this.eingebaut.setSource($this.queuedUrl);
          Player.set("currentTime", 0);
          Player.set("playing", true);
          $this.queuedUrl = null;
        }
      }
      Player.fire("player:vast:"+e);
    };
    // This method takes over the `video-display` version of eingebaut and uses it for video playback
    // It also overwrites with its own callback function, makes sure that other elements do not receive
    // any callbacks while playflow is in progress.
    $this.stealEingebaut = function(){
      if(!$this.eingebaut) {
        $this.eingebaut = Player.get('videoElement');
        $this.originalEingebaut.callback = $this.eingebaut.callback;
      }
      $this.originalEingebaut.source = $this.eingebaut.getSource();
      $this.eingebaut.callback = $this.vastEingebautCallback;
      $this.eingebaut.container.parent().css({zIndex:200});
      $this.container.show();
    };
    // Restore the eingebaut object from `video-display` back to it original state.
    $this.restoreEingebaut = function(){
      Player.set("playing", false);
      $this.eingebaut.callback = $this.originalEingebaut.callback;
      $this.eingebaut.container.parent().css({zIndex:0});
      Player.fire('player:video:pause');
      if($this.originalEingebaut.source) $this.eingebaut.setSource($this.originalEingebaut.source);
      $this.container.hide();
    };

    $this.playNextAd = function(){
      $this.reportedEvents = [];
      $this.currentAdIndex += 1;
      if ($this.playableAds.length <= $this.currentAdIndex) {
        $this.currentAdIndex = 0;
      }
      $this.queuePlay = false;
      $this.vastClickUrl = $this.playableAds[$this.currentAdIndex].clickUrl;
      $this.stealEingebaut();
      if (!Player.get("videoElement").canPlayType("video/mp4") && Player.get("displayDevice") != "flash") {
        $this.playerReady = false;
        if(!$this.loadEingebaut) $this.loadEingebaut = Player.get("eingebautConstructor");
        $this.loadEingebaut("flash", $this.vastEingebautCallback);
        $this.eingebaut = Player.get("videoElement");
        $this.switchedToFlash = true;
      }
      if ($this.playerReady) {
        $this.eingebaut.setSource($this.playableAds[$this.currentAdIndex].url);
        Player.set("currentTime", 0);
        Player.set("playing", true);
      } else {
        $this.queuedUrl = $this.playableAds[$this.currentAdIndex].url;
      }
      $this.render();
    };

    $this.destroyAd = function(keepPlaying){
      if(typeof keepPlaying == "undefined") {
        keepPlaying = true;
      }
      if ($this.switchedToFlash) {
        $this.loadEingebaut("html5", $this.vastEingebautCallback);
        $this.eingebaut = Player.get("videoElement");
      }
      $this.restoreEingebaut();
      if ($this.vastState != 'postroll') {
        $this.vastState = 'during';
        Player.set("currentTime", 0);
        Player.set("playing", keepPlaying);
      } else {
        $this.vastState = 'ended';
      }
    };

    Player.bind("player:video:play", function(){
      if ($this.active && ($this.vastState == 'before' || $this.vastState == 'ended') && $this.adsShowPreroll) {
        $this.vastState = 'preroll';
        Player.set("playing", false);
        if ($this.dataParsed && $this.playableAds.length > 0) {
          $this.playNextAd();
        } else {
          $this.queuePlay = true;
        }
      } else {
       $this.vastState = 'during';
      }
    });

    Player.bind("player:video:ended", function(){
      if ($this.active && $this.adsShowPostroll && $this.playableAds.length > 0) {
        $this.vastState = 'postroll';
       $this.playNextAd();
      } else {
       $this.vastState = 'ended';
      }
    });

    Player.bind("player:vast:ended", function(){
      $this.destroyAd(true);
    });

    Player.bind("player:video:loaded", function(){
      $this.vastState = 'before';
    });

    Player.bind("player:vast:timeupdate", function(){
      if ($this.adsShowCountdown && $this.playerReady) {
        $this.render();
      }
    });

    Player.setter('vastURL', function(url){
      var urls = url.split("\n");
      $.each(urls, function(i, v){
        $this.vastUrlCount += 1;
        $this.active = true;
        $this.init(v);
      });
    });
    Player.setter('clickAd', function(){
      if ($this.vastClickUrl && $this.vastClickUrl != "") {
        Player.set("playing", false);
        window.open($this.vastClickUrl);
        $this.destroyAd(false);
      }
    });
    Player.setter('closeAd', function(){
      $this.reportEvent("close", true);
      $this.destroyAd();
    });

    // Expose properties
    Player.getter('vastAllowClose', function(){
      return $this.adsAllowClose;
    });
    Player.getter('vastRemainingTime', function(){
      return Math.ceil(Player.get("duration")-Player.get("currentTime"));
    });
    Player.getter('vastCountdownText', function(){
      var rt = Player.get("vastRemainingTime");
      if (rt == 1) {
        return $this.adsCountdownTextSingular.replace("%", "1");
      } else {
        return $this.adsCountdownTextPlural.replace("%", ""+rt);
      }
    });
    Player.getter('vastShowCountdown', function(){
      return $this.adsShowCountdown;
    });
    Player.getter('vastActive', function(){
      return $this.active;
    });
    Player.getter('vastState', function(){
      return $this.vastState;
    });

    return $this;
  }
);

function checkIEAjaxFallback(){
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
}

$.ajaxTransport( "image", function( s ) {
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
