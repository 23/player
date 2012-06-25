# 23 Video Player

Video player framework for 23 Video build on Glue and the visualplatform API

===

**Missing modules:**

* Loading indicator
* Subtitles
* Sections
* PlayFlow/VAST
* Share button (+ pane)
* Playlist button (+ pane)
* Facebook/Twitter/Link buttons
* Quality button and menu
* Streams buttons and menu (if this is how we want to integrate it?)

**Missing features in modules:**

* *Analytics*: Embed source
* *Scrubber*: Drag handle

**Missing features:**

* Include same module multiple times: `{% glue share-button with "service":"facebook" %}`
* Load parameters, including `domain`
* Only show content after video is loaded
* Subclass `Glue` and call it player, rather than calling Glue.get etc at all times
* Play livestreams
* Flash fallback
* API concatenation
* Cached API returns (currently jquery=... comes in the way)


**In 23 Video:**

* Bootstrap HTML som liquid, include SEO.
