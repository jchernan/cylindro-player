
var AudioHandler = function() {

  // The Echo Nest API key
  var apiKey = 'FIO3CQK4FDLIXMKKT';

  // remix and playback variables
  var audioContext;
  var source;
  var player;
  var track;
  var buffer;
  var audioBuffer;

  // analysis variables
  var startTime;
  var lastSegment;
  var lastTatum;
  var lastBeat;
  var lastBar;
  var lastSection;
  var lastFutureSection;
  var minLoudness;
  var maxLoudness;

  // number of pitch keys
  var numberOfKeys = 12;
  // is playing indicator
  var isPlayingAudio = false;

  // animation canvas variables
  var debugCtx;
  var debugW = 330;
  var debugH = 250;
  var chartW = 300;
  var chartH = 250;
  var aveBarWidth = 30;
  var debugSpacing = 2;

  // integration with led_server
  var $;
  var postUrl = "http://localhost:5000";

  function init(jquery) {
    $ = jquery;
    $.ajaxSetup({ cache: false });
    // set up "update" event
    events.on("update", update);
    // set up remix.js
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    remixer = createJRemixer(audioContext, $, apiKey);
    player = remixer.getPlayer();
    // set up animation canvas
    var canvas = document.getElementById("audioDebug");
    debugCtx = canvas.getContext('2d');
    debugCtx.width = debugW;
    debugCtx.height = debugH;
    debugCtx.fillStyle = "rgb(255, 255, 255)";
    debugCtx.lineWidth = 1;
    debugCtx.strokeStyle = "rgb(40, 40, 40)";
    $('#audioDebugCtx').hide();
  }

  /*
  * Load sample MP3
  */
  function loadSampleAudio() {
    stopSound();
    // get the analysys data
    remixer.remixTrackById(ControlsHandler.audioParams.sampleID,
      ControlsHandler.audioParams.sampleURL, function(t, percent) {
      track = t;
      if (track.status == 'ok') {
        // get loudness max and min values
        computeLoudnessMaxMin();
        // remove track reference from objects
        removeCircularDependencies();
        // load the original audio
        var request = new XMLHttpRequest();
        request.open("GET", ControlsHandler.audioParams.sampleURL, true);
        request.responseType = "arraybuffer";
        request.onload = function() {
          audioContext.decodeAudioData(request.response, function(buffer) {
            console.log("Audio loaded...");
            audioBuffer = buffer;
            startSound();
          }, function(e) {
            console.log(e);
          });
        };
        request.send();
      }
    });
  }

  /*
  * Compute max and min loudness values
  */
  function computeLoudnessMaxMin() {
    minLoudness = Number.POSITIVE_INFINITY;
    maxLoudness = Number.NEGATIVE_INFINITY;
    // segments loudness
    var segments = track.analysis.segments
    for(var i = 0; i < segments.length; i++) {
      var l = segments[i].loudness_max;
      if (l < minLoudness) {
        minLoudness = l;
      }
      if (l > maxLoudness) {
        maxLoudness = l;
      }
    }
  }

  /*
  * Toogle play
  */
  function onTogglePlay(){
    if (ControlsHandler.audioParams.stop){
      stopSound();
    }else{
      startSound();
    }
  }

  /*
  * Get current time in milliseconds
  */
  function getTime() {
    return new Date().getTime();
  }

  /*
  * Play and set up segment, tatum, and beat position
  */
  function startSound() {
    // init position values
    startTime = getTime();
    lastSegment = 0;
    lastTatum = 0;
    lastBeat = 0;
    lastBar = 0;
    lastSection = 0;
    lastFutureSection = 0;
    // create source
    source = audioContext.createBufferSource();
    source.connect(audioContext.destination);
    source.buffer = audioBuffer;
    source.loop = false;
    source.onended = stopSound;
    // start source
    source.start(0);
    isPlayingAudio = true;
    $("#preloader").hide();
    console.log("Audio started...");
  }

  /*
  * Stop
  */
  function stopSound(){
    isPlayingAudio = false;
    if (source) {
      source.stop(0);
      source.disconnect();
    }
    debugCtx.clearRect(0, 0, debugW, debugH);
    console.log("Audio stopped...");
  }

  /*
  * Update function, called every frame
  */
  function update(){
    if (!isPlayingAudio) return;
    var segment = getSegment();
    var tatum = getTatum();
    var bar = getBar();
    var beat = getBeat();
    var section = getSection();
    var futureSection = getFutureSection();
    drawAnalysis(segment, tatum, bar, beat, section);
  }

  /*
  * Helper method that moves an index in an analysis array
  * (segments, tatums, beats) given the position on the
  * current sound playback
  */
  function getValue(last, data) {
    // start from the last value
    var offset = ControlsHandler.audioParams.offset;
    var position = (getTime() - startTime)/1000 + offset;
    if (last >= data.length || position < data[last].start) {
      return -1;
    } else {
      return last + 1;
    }
  }

  /*
  * Returns the index of the current segment
  * or -1 if the index has not changed since the last call
  */
  function getSegment() {
    var v = getValue(lastSegment, track.analysis.segments)
    if (v != -1) {
      lastSegment = v;
      var l = normalizeLoudness(track.analysis.segments[v].loudness_max);
      var p = track.analysis.segments[v].pitches;
      post('/segments/now', v, l, p);
    }
    return v;
  }

  /*
  * Returns the index of the current tatum
  * or -1 if the index has not changed since the last call
  */
  function getTatum() {
    var v = getValue(lastTatum, track.analysis.tatums)
    if (v != -1) {
      lastTatum = v;
      post('/tatums/now', v);
    }
    return v;
  }

  /*
  * Returns the index of the current beat
  * or -1 if the index has not changed since the last call
  */
  function getBeat() {
    var v = getValue(lastBeat, track.analysis.beats)
    if (v != -1) {
      lastBeat = v;
      post('/beats/now', v);
    }
    return v;
  }

  /*
  * Returns the index of the current bar
  * or -1 if the index has not changed since the last call
  */
  function getBar() {
    var v = getValue(lastBar, track.analysis.bars)
    if (v != -1) {
      lastBar = v;
      post('/bars/now', v);
    }
    return v;
  }

  /*
  * Returns the index of the current section
  * or -1 if the index has not changed since the last call
  */
  function getSection() {
    var v = getValue(lastSection, track.analysis.sections)
    if (v != -1) {
      lastSection = v;
      post('/sections/now', v);
    }
    return v;
  }

  function getFutureSection() {
    var data = track.analysis.sections
    var futureStart = data[lastFutureSection].start;
    var offset = ControlsHandler.audioParams.offset;
    var position = (getTime() - startTime)/1000 + offset;
    if (lastFutureSection >= data.length || position < futureStart - 8) {
      return -1;
    } else {
      lastFutureSection = lastFutureSection + 1;
      post('/sections/future', lastFutureSection);
      return lastFutureSection;
    }
  }

  /*
  * Draws the analysis
  */
  function drawAnalysis(segment, tatum, bar, beat, section) {

    if (!ControlsHandler.audioParams.shouldDraw) return;

    // draw min and max loudness
    debugCtx.beginPath();
    debugCtx.moveTo(0, 0.25 * chartH);
    debugCtx.lineTo(chartW, 0.25 * chartH);
    debugCtx.moveTo(0, 0.75 * chartH);
    debugCtx.lineTo(chartW, 0.75 * chartH);
    debugCtx.stroke();
    if (segment != -1) {
      // clear previous and redraw background
      debugCtx.clearRect(0, 0, debugW, debugH);
      debugCtx.fillStyle = "#FFF";
      debugCtx.fillRect(0, 0, debugW, debugH);
      // draw bar chart for pitches
      var barWidth = chartW / numberOfKeys;
      debugCtx.fillStyle = "#FE7207";
      for(var i = 0; i < numberOfKeys; i++) {
        var pitch = track.analysis.segments[segment].pitches[i];
        debugCtx.fillRect(
          i * barWidth,
          chartH,
          barWidth - debugSpacing,
          -pitch*chartH);
      }
      // draw line for loudness
      var loudness = normalizeLoudness(
        track.analysis.segments[segment].loudness_max);
      var lineY = chartH/2 - loudness*chartH/2;
      debugCtx.beginPath();
      debugCtx.moveTo(0, lineY);
      debugCtx.lineTo(chartW, lineY);
      debugCtx.stroke();
    }
    debugCtx.fillStyle="#0718FE";
    if (beat != -1) {
      if (bar != -1) {
        // change color to indicate a bar
        debugCtx.fillStyle="#07FEEE";
      }
      // draw beat
      debugCtx.fillRect(chartW, chartH, aveBarWidth, -chartH);
    }
  }

  /*
  * Returns a normalized (-0.5 to 0.5) loudness value
  */
  function normalizeLoudness(value) {
    return -0.5 + (value - minLoudness)/(maxLoudness - minLoudness);
  }

  /*
  * Returns the current remix track
  */
  function getTrack() {
    return track;
  }

  /*
  * Removes circular dependecies in the analysis object
  */
  function removeCircularDependencies() {
    removeProperties(track.analysis);
    removeProperties(track.analysis.segments);
    removeProperties(track.analysis.fsegments);
    removeProperties(track.analysis.tatums);
    removeProperties(track.analysis.beats);
    removeProperties(track.analysis.bars);
    removeProperties(track.analysis.sections);
  }

  /*
  * Removes properties from an object or list of objects.
  * Used to clean up circular dependecies in the analysis object.
  */
  function removeProperties(obj) {
    if (obj instanceof Array) {
      for (var i=0; i < obj.length; i++) {
        removeObjectProperties(obj[i]);
      }
    } else {
      removeObjectProperties(obj);
    }
  }

  /*
  * Properties that create circular dependencies
  * in the analysis object
  */
  var badProperties = [
    "track",
    "parent",
    "children",
    "next",
    "prev",
    "overlappingSegments",
    "oseg"
  ];

  /*
  * Removes properties from an object
  */
  function removeObjectProperties(obj) {
    for (var i=0; i < badProperties.length; i++) {
      var property = badProperties[i];
      if (obj.hasOwnProperty(property)) {
        obj[property] = null;
      }
    }
  }

  /*
  * Sends POST requests to the given endpoint
  * containing analysis data.
  */
  function post(endpoint, id, loudness, pitches) {

    if (!ControlsHandler.audioParams.shouldPost) return;
    
    var data = { id: id };
    if (loudness) {
      data['loudness'] = loudness;
    }
    if (pitches) {
      data['pitches'] = pitches;
    }
    $.ajax({
      type: "POST",
      contentType: "application/json",
      url: postUrl + endpoint,
      data: JSON.stringify(data),
      dataType: "json"
   });
  }

  return {
    loadSampleAudio: loadSampleAudio,
    update: update,
    init: init,
    onTogglePlay: onTogglePlay,
    track: getTrack
  };

}();
