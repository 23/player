// Live stream, Pseudostreaming, Background color, Controls
// NetStream.* etc events bliver ikke kaldt
// Poster
// Progress/timeupdate events

package com.visual {
  /* Flash widgets */
  import flash.display.Sprite;
  import flash.geom.Rectangle;
  import flash.media.SoundTransform;
  import flash.media.Video;
  import flash.net.NetConnection;
  import flash.net.NetStream;
  import flash.utils.setTimeout;

  /* Event types */
  import flash.events.AsyncErrorEvent;
  import flash.events.ErrorEvent;
  import flash.events.Event;
  import flash.events.IOErrorEvent;
  import flash.events.NetStatusEvent;
  import flash.events.SecurityErrorEvent;
	
  public class VisualVideo extends Sprite {
    // The video objects
    private var video:Object = null;
    private var connection:NetConnection = new NetConnection();
    private var stream:NetStream;
    // A few helpers for live stream subscriptions
    private var fcSubscribeCount:int = 0;
    private var fcSubscribeMaxRetries:int = 3;
    // Status
    private var isPlaying:Boolean = false;
    private var VideoStatus:Object = {
      DISCONNECTED: 'disconnected',
      LOADING: 'loading',
      CONNECTION_ERROR: 'connectionerror',
      PLAYING: 'playing',
      BUFFERING: 'buffering',
      SEEKING: 'seeking',
      PAUSED: 'paused',
      STOPPED: 'stopped'
    };
    // Callback for events
    public var callback:Function = function():void{};
    
    // Constructor method
    public function VisualVideo() {}
    private var inited:Boolean = false;
    private function init():void {
      if(inited) return;

      this.stage.addEventListener(Event.RESIZE, matchVideoSize);

      inited = true;
    }
    
    // PROPERTIES
    // Property: State
    private var _state:String = VideoStatus.DISCONNECTED;
    public function set state(s:String):void {
      if(_state==s) return;
      _state = s;

      switch(s){
      case VideoStatus.DISCONNECTED:
        break;
      case VideoStatus.LOADING:
        break;
      case VideoStatus.CONNECTION_ERROR:
        break;
      case VideoStatus.PLAYING:
        this.callback('play');
        this.callback('playing');
        break;
      case VideoStatus.BUFFERING:
        break;
      case VideoStatus.SEEKING:
        break;
      case VideoStatus.PAUSED:
      case VideoStatus.STOPPED:
        this.callback('pause');
        break;
      }
    }
    public function get state():String {
      return _state;
    }

    // Property: Source
    private var _source:String = null;
    public function set source(s:String):void {
      if(_source==s) return;
      _source=s;
      reset();
    }
    public function get source():String {
      return _source;
    }

    // Property: Poster
    private var _poster:String = null;
    public function set poster(p:String):void {
      if(_poster==p) return;
      trace(p);
      _poster=p;
    }
    public function get poster():String {
      return _poster;
    }

    // Property: Playing
    public function set playing(p:Boolean):void {
      if (this.playing) {
        pause();
      } else {
        play();
      }
    }
    public function get playing():Boolean {
      return isPlaying;
      /*
        return (
        this.state = VideoStatus.PLAYING || 
        this.state = VideoStatus.LOADING || 
        this.state = VideoStatus.BUFFERING || 
        this.state = VideoStatus.SEEKING
        );
      */
    }

    // Property: Seeking
    public function get seeking():Boolean {
      return (this.state == VideoStatus.SEEKING);
    }

    // Property: Ended
    public function get ended():Boolean {
      return (this.stream && duration>0 && this.stream.time>=(duration-0.5));
    }

    // Property: Current time
    public function set currentTime(ct:Number):void {
      if(!this.connection||!this.stream) return;
      if(ct<0||ct>duration) return;
      if(isLive) return;
      this.stream.seek(ct);
    }
    public function get currentTime():Number {
      return(this.stream ? this.stream.time : 0);
    }

    // Property: Duration
    private var _duration:Number = 0; 
    public function get duration():Number {
      return _duration;
    }

    // Property: Buffer time
    public function get bufferTime():Number {
      var bytesLoaded:int = (this.stream ? this.stream.bytesLoaded : 0);
      var bytesTotal:int = (this.stream ? this.stream.bytesTotal : 0);
      if(this.duration<=0 || bytesLoaded<=0 || bytesTotal<=0) {
        return 0;
      } else {
        return (bytesLoaded/bytesTotal)*duration;
      }
    }
    
    // Property: Volume
    private var _volume:Number = 1;
    public function set volume(v:Number):void {
      if (_volume != v) {
        _volume = v;
        if(this.stream) this.stream.soundTransform = new SoundTransform(_volume);
        this.callback('volumechange');
      }
    }
    public function get volume():Number {
      return _volume;
    }

    // Is this an RTMP stream?
    public function get isLive():Boolean {return(isRTMP);}
    public function get isRTMP():Boolean {
      if(_source) {
        return(/^rtmp:\/\//.test(_source.toLowerCase()));
      } else {
        return(false);
      }
    }
    private function splitRTMPSource():Array {
      var match:Array = _source.match(/^(.+\/)([^\/]+)/);
      if(match.length==3) {
        return [match[1], match[2]];
      } else {
        return [null, _source];
      }
    }
    public function get streamURL():String {
      if(this.isRTMP) {
        return(splitRTMPSource()[0]);
      } else {
        return(null);
      }
    }
    public function get streamName():String {
      if(this.isRTMP) {
        return(splitRTMPSource()[1]);
      } else {
        return(_source);
      }
    }
		

		


    // THE HEAVY LIFTING
    private function close():void {this.stop();}
    private function stop():void {
      if(this.stream) {
        this.stream.pause();
        this.stream.close();
        isPlaying = false;
        this.state = VideoStatus.STOPPED;
      }
    }
    private function play():void {
      if(!this.connection.connected) {
        connect();
      } if(this.stream) {
        this.stream.resume();
        isPlaying = true;
        this.state = VideoStatus.PLAYING;
      }
    }
    private function pause():void {
      if(this.stream) {
        this.stream.pause();
        isPlaying = false;
        this.state = VideoStatus.PAUSED;
      }
    }

    // STREAM EVENTS AND LOGIC
    private function reset():void {
      init();
      stop();
      try {this.video.clear();}catch(e:Object){}
      // Reset progress
      _duration = 0;
      _lastProgressBytes = 0;
      this.callback('progress');
      this.callback('timeupdate');
      // Reset aspectRatio (but maintain _userAspectRatio)
      _videoAspectRatio = 1;
      // Stop stream
      this.stream = null;
      // Prepare the net connection object
      this.connection = new NetConnection();
      this.connection.client = defaultClient;
      this.connection.addEventListener(NetStatusEvent.NET_STATUS, netStatusHandler);
      this.connection.addEventListener(SecurityErrorEvent.SECURITY_ERROR, netSecurityErrorHandler);
    }
    private function connect():void {
      reset();
      this.state = VideoStatus.LOADING;
      this.fcSubscribeCount = 0;
      this.connection.connect(this.streamURL);
    }
    private function attachStreamToVideo():void {
      this.stream = new NetStream(this.connection);
      this.stream.soundTransform = new SoundTransform(_volume);
      this.stream.client = defaultClient;
      this.stream.bufferTime = 2;
      this.stream.addEventListener(AsyncErrorEvent.ASYNC_ERROR, genericErrorEvent);
      this.stream.addEventListener(IOErrorEvent.IO_ERROR, genericErrorEvent);
      this.stream.addEventListener(NetStatusEvent.NET_STATUS, netStatusHandler);
      // Defaults for the video display
      if(!this.video) {
        var v:Video = new Video();
        v.smoothing = true;
        v.deblocking = 1;
        this.addChild(v);
        v.visible = true;
        this.video = v;	
      }
      this.video.attachNetStream(this.stream);
      this.state = VideoStatus.BUFFERING;
      this.stream.play(this.streamName);
      matchVideoSize();
    }
    private function subscribe():void {
      this.connection.call("FCSubscribe", null, this.streamName);
    }

    private var _videoWidth:Number = 1; 
    private var _videoHeight:Number = 1; 
    private var _videoAspectRatio:Number = 16/9; 
    private var defaultClient:Object = (function(context:Object):Object {
        return {
          onFCSubscribe:function(info:Object):void{
            switch(info.code){
            case "NetStream.Play.StreamNotFound":
            if(fcSubscribeCount >= fcSubscribeMaxRetries){
              fcSubscribeCount = 0;
            } else {
              fcSubscribeCount++;
              setTimeout(context.subscribe, 1000);
            }
            break;
            case "NetStream.Play.Start":
            fcSubscribeCount = 0;
            context.attachStreamToVideo();
            break;
            }				
          },
          onFCUnsubscribe:function(info:Object):void{},
          onMetaData:function(item:Object):void{
            try {
              _videoHeight = item.height;
              _videoWidth = item.width;
              _videoAspectRatio = item.width/item.height;
              matchVideoSize();
            }catch(e:ErrorEvent){}
            try {
              _duration = item.duration;
            }catch(e:ErrorEvent){_duration=0;}
          }
        }
      })(this);
		
    private function genericErrorEvent(event:Event):void {
      this.state = VideoStatus.CONNECTION_ERROR;
    }
    private function netStatusHandler(event:NetStatusEvent):void {
      trace(event.info.code);
      switch (event.info.code) {
      case "NetConnection.Connect.Rejected":
      case "NetConnection.Connect.IdleTimeout":
      case "NetConnection.Connect.Failed":
      case "NetStream.Connect.Failed":
      case "NetStream.Connect.Rejected":
      case "NetStream.Failed":
      case "NetStream.Play.Failed":
      case "NetStream.Play.StreamNotFound":
        this.state = VideoStatus.CONNECTION_ERROR;
      break;
      case "NetConnection.Connect.Closed":
        this.state = VideoStatus.DISCONNECTED;
        break;
      case "NetConnection.Connect.Success":
        this.state = VideoStatus.LOADING;
        this.callback('loadeddata');
        this.callback('loadedmetadata');
        this.callback('canplay');
        if(this.isRTMP) {
          subscribe();
        } else {
          attachStreamToVideo();
        }
        break;
      case "NetStream.Buffer.Empty":
        if(this.ended) { 
          isPlaying = false;
          this.state = VideoStatus.STOPPED;
          if(this.ended) this.callback('ended');
        } else {
          if(isPlaying) this.state = VideoStatus.BUFFERING;
        }
        break;
      case "NetStream.Seek.Notify":        
      case "NetStream.Unpause.Notify":
        this.callback('seeked');
        break;
      case "NetStream.Buffer.Full":
        if(isPlaying) {
          this.state = VideoStatus.PLAYING;
        }
        break;
      case "NetStream.Play.Start":
        isPlaying = true;
        this.state = VideoStatus.PLAYING;
        break;
      case "NetStream.Pause.Notify":
        isPlaying = false;
        this.state = VideoStatus.PAUSED;
        break;
      case "NetStream.Play.Stop":
        isPlaying = false;
        this.state = VideoStatus.STOPPED;
        if(this.ended) this.callback('ended');
        break;
      }
    }			
    private function netSecurityErrorHandler(event:SecurityErrorEvent):void {}
		
    // Match size of video to the container
    private function matchVideoSize(e:Event=null):void {
      if(this&&this.width&&this.video) {x
        var stageAspectRatio:Number = this.stage.stageWidth/this.stage.stageHeight;
        var x:int, y:int, w:int, h:int = 0;
        if(stageAspectRatio>_videoAspectRatio) {
          h = this.stage.stageHeight;
          w = this.stage.stageHeight*_videoAspectRatio;
          x = (this.stage.stageWidth-w)/2;
          y = 0;
        } else {
          w = this.stage.stageWidth;
          h = this.stage.stageWidth/_videoAspectRatio;
          x = 0;
          y = (this.stage.stageHeight-h)/2;
        }

        /*
        trace('_videoAspectRatio = ' + _videoAspectRatio);
        trace('stageAspectRatio = ' + stageAspectRatio);
        trace('w = ' + w);
        trace('h = ' + h);
        trace('x = ' + x);
        trace('y = ' + y);
        */

        this.video.x = x;
        this.video.y = y;
        this.video.width = w;
        this.video.height = h;
      }
    }

    // Handle progress
    private var _lastProgressBytes:int = 0;
    private var _lastProgressTime:int = 0;
    private function updateProgress():void {
      if(!this.connection||!this.stream) return;
      if(this.stream.bytesTotal >= 0 && this.stream.bytesLoaded != _lastProgressBytes) {
        this.callback('progress');
      }
      // Actually, this should probably be time>=0 rather than time>0, but we
      // don't like the scrubber jumping back when switching streams. Fugly.
      if(this.stream.time > 0 && this.stream.time != _lastProgressTime) {
        this.callback('timeupdate');
      }			
      _lastProgressBytes = this.stream.bytesLoaded;
      _lastProgressTime = this.stream.time;
    }
  }
}
