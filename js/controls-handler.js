
var ControlsHandler = function() {

  var audioParams = {
    stop: false,
    shouldPost: false,
    shouldDraw: true,
    offset: 0.3,
    sampleURL: "res/1451_-_D.mp3",
    sampleID: "TRCYWPQ139279B3308"
  };

  function init(){
    // init DAT GUI control panel
    gui = new dat.GUI({autoPlace: false });
    $('#controls').append(gui.domElement);
    var f2 = gui.addFolder('Settings');
    // play/stop toogle
    f2.add(audioParams, 'stop').listen().onChange(
      AudioHandler.onTogglePlay).name("Paused");
    // post analysis toogle
    f2.add(audioParams, 'shouldPost').listen().name("Post");
    // draw analysis toogle
    f2.add(audioParams, 'shouldDraw').listen().name("Draw");
    // playback sync offset
    f2.add(audioParams, 'offset', 0, 1).step(0.01).name("Sync offset");
    f2.open();
    // load sample mp3
    AudioHandler.loadSampleAudio();
  }

  return {
    init: init,
    audioParams: audioParams,
  };
}();
