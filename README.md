# TwentyThree video player

Video player framework for [TwentyThree](https://www.twentythree.net) build on Glue, Eingebaut and the Visualplatform API

# Modifying and building the player using git repository

To build you own player based on the git repository, you will need to check our the code and its dependencies:

    mkdir player
    cd player
    git clone git@github.com:23/glue.git
    git clone git@github.com:23/eingebaut.git
    git clone git@github.com:23/visualplatform.js.git
    git clone git@github.com:23/player.git
    
Not you can start a server on `localhost` to bootstrap the code from:

    python -m SimpleHTTPServer
    
Now, open up http://localhost:8000/player/src/player.html in a browser, possibly using your own domain for TwentyThree instead.

This will get you most of the relevant code, although jQuery and the TwentyThree version of Liquid.js are still loaded remotely. You shouldn't need to modify these, although you might want to create Liquid filters for your purposes.

The Glue framework makes it easy to create both a development and an optimized production version of the project. To remove or add modules, update `manifest.json` and run:

    ../glue/build.tcl manifest.json 
   
This will overwrite the `dist/` folder entirely along with `src/player.html`. 

After building, you will find a fully minimized and optimized version of your project ready for distribution in `dist/`. You can test this by opening up http://locahost:8000/player/dist/player.html?domain=video.twentythree.net.
