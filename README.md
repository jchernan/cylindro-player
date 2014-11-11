Cylindro Player
===============

Cylindro is an LED animation project built during Music Hack Day
Boston 2014. It uses The Echo Nest API to analyze a song and
creates effects on the LED canvas based on the song structure,
loudness and pitch.

Cylindro Player interfaces with The Echo Nest API, plays the song
using the Web Audio API, and communicates with the Python server
that drives Cylindro. HTTP POST requests are sent during playback
to transfer the analysis data in real time.

Check out the Cylindro Player demo page
[here](http://jchernan.github.io/cylindro-player).
