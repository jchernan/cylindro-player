
var ControlsHandler = function() {

  var audioParams = {
    stop: false,
    shouldPost: false,
    shouldDraw: true,
    offset: 0.25,
    postURL: "http://localhost:8888",
    sampleURL: "res/SinGravedad.mp3",
    sampleID: "TRNEHDX1499EFDA675"
  };

  function init(){
    // init DAT GUI control panel
    gui = new dat.GUI({autoPlace: false });
    $('#controls').append(gui.domElement);

    // play/stop toogle
    gui.add(audioParams, "stop").listen().onChange(
      AudioHandler.onTogglePlay).name("Stop");
    // post analysis toogle
    gui.add(audioParams, "shouldPost").name("Post");
    // draw analysis toogle
    gui.add(audioParams, "shouldDraw").name("Draw");
    // playback sync offset
    gui.add(audioParams, "offset", 0, 1).step(0.01).name("Sync offset");
    // post url
    gui.add(audioParams, "postURL").name("Server URL");

    // open DAT GUI
    gui.open();
    // load sample mp3
    AudioHandler.loadAudio();
  }

  return {
    init: init,
    audioParams: audioParams,
  };
}();
