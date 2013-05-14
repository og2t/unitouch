var stats;

// Enable gestures feedback
var DEBUG = true;

var canvas, ctx;
var context;
var gestures;
var container;

/**
 *  Options
 */
var numBalls = 22;
var spring = 0.01;
var gravity = 0.0;
var friction = -0.57;
var balls = [];

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

  // Init balls
  for (var i = 0; i < numBalls; i++) {
    var ball = {
      id: i,
      x: random(0, canvas.width),
      y: random(0, canvas.height),
      radius: random(50, 80),
      vx: 0,
      vy: 0,
      touchId: null
    };
    balls.push(ball);
  }
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


function random(min, max) {
  return Math.random() * (max - min) + min;
}


/**
 * Render
 */
function render() {
  // Start time measuring
  stats.begin();

  resetCanvas();

  var ball;
  for (var i = 0; i < numBalls; i++) {
    ball = balls[i];
    collide(ball);
    move(ball);
    draw(ball);
    ball.touchId = null;
  }

  for (var i = 0, l = gestures.getNumTouchPoints(); i < l; i++) {
    var touchPoint = gestures.getTouchPoint(i);

    // Draw circle
    ctx.beginPath();
    ctx.strokeStyle = options.lineColor;
    ctx.lineWidth = options.outlineWidth;
    ctx.arc(touchPoint.clientX, touchPoint.clientY, ball.radius, 0, Math.PI * 2, true);
    ctx.stroke();

    // Draw text
    ctx.fillStyle = options.textColor;
    ctx.font = 'bold 16px Helvetica, Arial';

    // Show the (touch) point id
    ctx.fillText('id ' + touchPoint.pointerId, touchPoint.clientX - 100, touchPoint.clientY - 25);

    var closestBall = getNearestBall(touchPoint.clientX, touchPoint.clientY);
    if (closestBall != null) {
      // var factor = 0.3;
      // closestBall.x += (touchPoint.clientX - closestBall.x) * factor;
      // closestBall.y += (touchPoint.clientY - closestBall.y) * factor;
      closestBall.x = touchPoint.clientX;
      closestBall.y = touchPoint.clientY;
      closestBall.touchId = touchPoint.pointerId;
    }
  }

  // Stop time measuring
  stats.end();
}


function collide(ball) {
  var other;
  for (var i = 0; i < numBalls; i++) {
    other = balls[i];
    // Don't collide with itself
    if (ball.id == other.id || ball.touchId != null) continue;
    var dx = other.x - ball.x;
    var dy = other.y - ball.y;
    var distance = Math.sqrt(dx * dx + dy * dy);
    var minDist = other.radius + ball.radius;
    if (distance < minDist) { 
      var angle = Math.atan2(dy, dx);
      var targetX = ball.x + Math.cos(angle) * minDist;
      var targetY = ball.y + Math.sin(angle) * minDist;
      var ax = (targetX - other.x) * spring;
      var ay = (targetY - other.y) * spring;
      ball.vx -= ax;
      ball.vy -= ay;
      other.vx += ax;
      other.vy += ay;
    }
  }   
}


function move(ball) {
  ball.vy += gravity;
  ball.x += ball.vx;
  ball.y += ball.vy;
  if (ball.x + ball.radius > canvas.width) {
    ball.x = canvas.width - ball.radius;
    ball.vx *= friction; 
  }
  else if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.vx *= friction;
  }
  if (ball.y + ball.radius > canvas.height) {
    ball.y = canvas.height - ball.radius;
    ball.vy *= friction; 
  } 
  else if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.vy *= friction;
  }
}


function getNearestBall(x, y) {
    var distance, ball;

    var minDistance = 1000000;
    var snappingRadius = 10;
    var nearestBall = null;
    
    for (var i = 0; i < numBalls; i++) {
      ball = balls[i];
      distance = getDistance(ball, x, y);
      if (distance < minDistance) {
        minDistance = distance;
        if (minDistance <= snappingRadius + ball.radius) {
          nearestBall = ball;
        }
      }
    }
    return nearestBall;
}


function getDistance(ball, x, y) {
  var dx = x - ball.x;
  var dy = y - ball.y;
  return Math.sqrt(dx * dx + dy * dy);
}


function draw(ball) {
  ctx.beginPath();
  if (ball.touchId != null) {
    ctx.fillStyle = '#f40';
  } else {    
    ctx.fillStyle = '#000';
  }
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2, false); 
  ctx.closePath();
  ctx.fill();
}


/**
 * Reset canvas:
 * onDragStopHandler
 * mouseDragStopHandler
 */
function resetCanvas(event) {
  // Clear the canvas
  /* A hack to work around lack of orientation change/resize event */
  if (canvas.height != context.offsetHeight) {
    canvas.width = context.offsetWidth;
    canvas.height = context.offsetHeight;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Make sure we scroll to the top left
  window.scrollTo(0, 0);
}