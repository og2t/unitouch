var stats;

// Enable gestures feedback
var DEBUG = true;
var DRAW_DIRECTION_VECTOR = false;


var showDragDistance;
var canvas, ctx;
var context;
var gestures;
var container;
    
/**
 *  Options
 */
var options = {
    lineColor: '#FFFFFF',
    textColor: '#FFFFFF',
    outlineWidth: 6,
    connectionWidth: 2
};


init();

// Init stats
initStats();

// Set render @ 60 FPS
setInterval(render, 1000 / 60);


function init() {
  showDragDistance = false;

  // Create touch container
  container = document.createElement('div');
  container.className = 'container';
  document.body.appendChild(container);

  // Create canvas
  canvas = document.createElement('canvas');
  canvas.width = container.offsetWidth;
  canvas.height = container.offsetHeight;
  container.appendChild(canvas);
  ctx = canvas.getContext('2d');

  // Set up gesture recognition for container context
  context = document.querySelector('.container');

  // Init gestures controller
  gestures = app.touch.Gestures;
  gestures.init(context);
}

/**
 * Initialise stats
 */
function initStats() {
  stats = new Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.right = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);
}

/**
 * Render
 */
function render() {
    // Start time measuring
    stats.begin();

    // Show gestures feedback
    if (DEBUG) {
      drawTouchPoints();
    }

    // Update values
    document.querySelector('#rotation').innerText = gestures.getRotation().toFixed(2);
    document.querySelector('#scale').innerText = gestures.getScale().toFixed(2);
    document.querySelector('#fingers').innerText = gestures.getNumTouchPoints();
    document.querySelector('#gesture').innerText = gestures.getGesture();
    document.querySelector('#gestureTime').innerText = gestures.getGestureTime();
    document.querySelector('#swipe').innerText = gestures.getSwipe();

    // Stop time measuring
    stats.end();
}


/**
 * Reset canvas:
 * onDragStopHandler
 * mouseDragStopHandler
 */
function resetCanvas(event) {
    // Clear the canvas
    canvas.width = context.offsetWidth;
    // Make sure we scroll to the top left
    window.scrollTo(0, 0);
}


/**
 * Render the touch points with connections
 */
function drawTouchPoints() {

  /* A hack to work around lack of orientation change/resize event */
  if (canvas.height != context.offsetHeight) {
    canvas.width = context.offsetWidth;
    canvas.height = context.offsetHeight;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (var i = 0, l = gestures.getNumTouchPoints(); i < l; i++) {
    var touchPoint = gestures.getTouchPoint(i);

    // Draw circle
    ctx.beginPath();
    ctx.strokeStyle = options.lineColor;
    ctx.lineWidth = options.outlineWidth;
    ctx.arc(touchPoint.clientX, touchPoint.clientY, 50, 0, Math.PI * 2, true);
    ctx.stroke();

    // Draw direction vector
    if (DRAW_DIRECTION_VECTOR) {
      ctx.beginPath();
      ctx.strokeStyle = '#f40';
      ctx.lineWidth = '2';
      var toX = Math.cos(touchPoint.angle + Math.PI) * touchPoint.distance * 5;
      var toY = Math.sin(touchPoint.angle + Math.PI) * touchPoint.distance * 5;
      ctx.moveTo(touchPoint.clientX, touchPoint.clientY);
      ctx.lineTo(touchPoint.clientX + toX, touchPoint.clientY + toY);
      ctx.stroke();
    }

    // Draw text
    ctx.fillStyle = options.textColor;
    ctx.font = 'bold 16px Helvetica, Arial';

    // Show the (touch) point id
    ctx.fillText('id ' + touchPoint.pointerId, touchPoint.clientX - 100, touchPoint.clientY - 25);

    if (showDragDistance) {
      // Show total pixel distance travelled by this (touch) point
      ctx.fillText(Math.floor(touchPoint.totalDistance), touchPoint.clientX - 100, touchPoint.clientY);
    }
  }

  // Draw lines between the touch pointers
  if (l > 1) {
    ctx.beginPath();
    ctx.lineWidth = options.connectionWidth;
    ctx.strokeStyle = options.lineColor;
    ctx.moveTo(pointers[keys[0]].clientX, pointers[keys[0]].clientY);

    for (var i = 1; i < l; i++) {
      ctx.lineTo(pointers[keys[i]].clientX, pointers[keys[i]].clientY);
    }

    ctx.stroke();
  }
}


/**
 * Show Drag Distance click handler
 */
function onShowDragDistanceClick(event) {
  // Get the checkbox state
  var state = document.getElementById('checkbox').checked;
  // Update the controller
  showDragDistance = state;
}