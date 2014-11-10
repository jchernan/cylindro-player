
var events = new Events();

var Main = function() {

  function init() {

    document.onselectstart = function() {
      return false;
    };

    AudioHandler.init($);
    ControlsHandler.init();

    update();
  }

  function update() {
    requestAnimationFrame(update);
    events.emit("update");
  }

  return {
    init:init
  };

}();

$(document).ready(function() {
  Main.init();
});
