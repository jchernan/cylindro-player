Cylindro Player
===============

Cylindro is an LED animation project built during Music Hack Day
Boston 2014. Cylindro takes a song, analyzes it, and creates
effects on the LED canvas based on the song structure, loudness
and pitch.

Cylindro Player uses The Echo Nest API to get the song analysis
and plays the song using Web Audio API. It then communicates with
the Python server that drives Cylindro through HTTP POST requests.
The HTTP requests, sent during playback, transfer the analysis
data in real time.

Check out the Cylindro Player demo page
[here](http://jchernan.github.io/cylindro-player).

The Cylindro Server code can be found
[here](https://github.com/jgoldbeck/cylindro-server).

More information about the project, including the YouTube video,
can be found at the Hacker League
[page](https://www.hackerleague.org/hackathons/music-hack-day-boston-2014/hacks/cylindro).


