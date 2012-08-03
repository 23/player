package {
  import flash.display.Sprite;
  import flash.events.Event;
  import flash.external.ExternalInterface;
  import com.visual.VisualVideo;
  
  public class FlashFallback extends Sprite {
    private var video:VisualVideo;
    
    public function FlashFallback() {
      stage.scaleMode = 'noScale'; //StageScaleMode.NO_SCALE
      stage.align = 'TL'; //StageAlign.TOP_LEFT;
      video = new VisualVideo();
      addChild(video);
      
      if (ExternalInterface.available) {
        video.callback = function(ev:String):void {
          ExternalInterface.call("FlashFallbackCallback", ev);
        }
        ExternalInterface.addCallback("setSource", function(source:String):void {
            video.source = source;
          });
        ExternalInterface.addCallback("getSource", function():String{
            return video.source;
          });
        ExternalInterface.addCallback("setPoster", function(poster:String):void {
            video.poster = poster;
          });
        ExternalInterface.addCallback("getPoster", function():String{
            return video.poster;
          });
        ExternalInterface.addCallback("setPlaying", function(playing:Boolean):void {
            video.playing = playing;
          });
        ExternalInterface.addCallback("getPlaying", function():Boolean{
            return video.playing;
          });
        ExternalInterface.addCallback("setPaused", function(paused:Boolean):void {
            video.playing = !paused;
          });
        ExternalInterface.addCallback("getPaused", function():Boolean{
            return !video.playing;
          });
        ExternalInterface.addCallback("setCurrentTime", function(currentTime:Number):void {
            video.currentTime = currentTime;
          });
        ExternalInterface.addCallback("getCurrentTime", function():Number{
            return video.currentTime;
          });
        ExternalInterface.addCallback("getEnded", function():Boolean{
            return video.ended;
          });
        ExternalInterface.addCallback("getSeeking", function():Boolean{
            return video.seeking;
          });
        ExternalInterface.addCallback("getDuration", function():Number{
            return video.duration;
          });
        ExternalInterface.addCallback("getBufferTime", function():Number{
            return video.bufferTime;
          });
        ExternalInterface.addCallback("setVolume", function(volume:Number):void {
            video.volume = volume;
          });
        ExternalInterface.addCallback("getVolume", function():Number{
            return video.volume;
          });
      } else {
        trace('Error loading FlashFallback: No ExternalInterface');
      }
    }
  }
}
