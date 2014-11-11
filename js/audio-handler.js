
var AudioHandler = function() {

  // The Echo Nest API key
  var apiKey = "FIO3CQK4FDLIXMKKT";
  var apiUrl = "http://developer.echonest.com/api/v4";
  var profileEndpoint = "/track/profile?format=json&bucket=audio_summary"

  // audio variables
  var audioContext;
  var source;
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
  var futureOffset = -5;

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

  var $;

  function init(jquery) {
    $ = jquery;
    $.ajaxSetup({ cache: false });
    // set up "update" event
    events.on("update", update);
    // set up web audio
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
  * load sample MP3
  */
  function loadAudio() {
    stopSound();
    // get the analysys data
    loadAnalysis(ControlsHandler.audioParams.sampleID,
      ControlsHandler.audioParams.sampleURL, function(t) {
      track = t;
      if (track.status == 'ok') {
        // get loudness max and min values
        computeLoudnessMaxMin();
        // load the original audio
        var request = new XMLHttpRequest();
        request.open("GET", ControlsHandler.audioParams.sampleURL, true);
        request.responseType = "arraybuffer";
        request.onload = function() {
          audioContext.decodeAudioData(request.response, function(buffer) {
            console.log("Audio loaded ...");
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

  function loadAnalysis(trackId, trackUrl, callback) {
    var track;
    var getProfileUrl = apiUrl + profileEndpoint
    var getProfileParameters = { id: trackId, api_key: apiKey };
    var retryCount = 3;
    var retryInterval = 3000;

    function lookForAnalysis(trackId, trackUrl, callback) {
      $.getJSON(getProfileUrl, getProfileParameters, function(data) {
        var analysisUrl = data.response.track.audio_summary.analysis_url;
        var getAnalysisParameters = {
          q: "select * from json where url=\"" + analysisUrl + "\"",
          format: "json"
        };
        track = data.response.track;
        // this call is proxied through the yahoo query engine.
        $.getJSON("http://query.yahooapis.com/v1/public/yql",
          getAnalysisParameters, function(data) {
            if (data.query.results != null) {
              console.log("Analysis obtained ...");
              track.analysis = data.query.results.json;
              track.status = "ok";
              callback(track);
            } else {
              retryCount = retryCount - 1;
              retryInterval = retryInterval + retryInterval;
              if (retryCount > 0) {
                console.log("Analysis pending, trying again ...")
                setTimeout(function () {
                    lookForAnalysis(trackId, trackUrl, callback);
                }, retryInterval);
              } else {
                console.log("Analysis not found ...");
                callback(track);
              }
            }
          }); // end get analysis
      }); // end get profile
    } // end lookForAnalysis

    lookForAnalysis(trackId, trackUrl, callback);
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
    lastSegment = -1;
    lastTatum = -1;
    lastBeat = -1;
    lastBar = -1;
    lastSection = -1;
    lastFutureSection = 0;
    // create source
    source = audioContext.createBufferSource();
    source.connect(audioContext.destination);
    source.buffer = audioBuffer;
    source.loop = false;
    source.onended = function() {
      ControlsHandler.audioParams.stop = true;
      stopSound();
    };
    // start source
    source.start(0);
    isPlayingAudio = true;
    $("#preloader").hide();
    console.log("Audio started ...");
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
    console.log("Audio stopped ...");
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
  * (segments, tatums, beats, bars, sections) given the
  * position on the current sound playback
  */
  function getValue(last, data, positionOffset) {
    var next = last + 1;
    if (next >= data.length || !data[next]) {
      return -1;
    }
    var syncOffset = ControlsHandler.audioParams.offset;
    var position = (getTime() - startTime)/1000 + syncOffset;
    var nextPosition = data[next].start;
    if (positionOffset) {
      nextPosition = parseFloat(nextPosition) + parseFloat(positionOffset);
    }
    if (position < nextPosition) {
      return -1;
    } else {
      return next;
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
      var segment = track.analysis.segments[v];
      var l = normalizeLoudness(segment.loudness_max);
      var p = segment.pitches;
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
    var v = getValue(lastFutureSection,
      track.analysis.sections, futureOffset)
    if (v != -1) {
      lastFutureSection = v;
      post('/sections/future', v);
    }
    return v;
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
  * Returns the current track
  */
  function getTrack() {
    return track;
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
      url: ControlsHandler.audioParams.postURL + endpoint,
      data: JSON.stringify(data),
      dataType: "json"
   });
  }

  return {
    loadAudio: loadAudio,
    update: update,
    init: init,
    onTogglePlay: onTogglePlay,
    track: getTrack
  };

}();
