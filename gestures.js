/**
 * Gesture Recogniser v0.5
 *
 * Based on http://shinydemos.com/touch-tracker/
 *
 * Uses adapted script from Seb-Lee Delisle's JSTouchController
 * http://seb.ly/demos/JSTouchController/Touches.html
 *
 * @see
 * http://m14i.wordpress.com/2009/10/25/javascript-touch-and-gesture-events-iphone-and-android/
 *
 **/

var app = app || {};
app.touch = app.touch || {};

// Define constants
app.touch.gesture = app.touch.gesture || {
    NONE: 'none',
    TAP: 'tap',
    SWIPE: 'swipe',
    ROTATE: 'rotate',
    PALM: 'palm',
    PINCH: 'pinch',
    SCRATCH: 'scratch',
    STRETCH: 'stretch'
};

app.touch.direction = app.touch.direction || {
    NONE: 'none',
    UP: 'up',
    LEFT: 'left',
    RIGHT: 'right',
    DOWN: 'down'
};


app.touch.Gestures = (function() {

    /**
     * Contants
     */
    var VERSION = 0.02;
    var IOS = 'ios';
    var MICROSOFT = 'ms';
    var OTHER = 'other';

    var DISABLE_INERTIA = true;
    var MIN_GESTURE_ROTATION = 20;
    var MIN_GESTURE_SCALE = .3;
    var MAX_GESTURE_TIME = 1000;
    var MIN_SWIPE_DISTANCE = 50;
    var MAX_SWIPE_DISTANCE = 200;
    var MIN_PALM_POINTS = 5;


    /**
     *  Variables
     */
    var rotation;
    var scale;
    var recognized;
    var pointers;
    var keys;
    var context;
    var platform;
    var msGesture;
    var currentTime;
    var initialTime;
    var offset;
    var mouseId;
    var mouseOutside;
    var detectedGesture;
    var detectedDirection;
    var gestureTime;
    var swipeX, swipeY;


    /**
     * Init
     */
    function init(touchContext) {
        context = touchContext;

        pointers = {};
        keys = [];
        mouseId = -1;
        resetGesture();

        offset = getAbsolutePosition(context);
        platform = detectPlatform();

        addEventListeners();
    }


    /**
     * Detect platform
     */
    function detectPlatform() {
        if (window.navigator.msPointerEnabled) {
            if (typeof MSGesture !== 'undefined' && MSGesture !== null) {
                msGesture = new MSGesture();
                msGesture.target = context;
            }
            return MICROSOFT;
        } else if (window.ontouchstart !== undefined) {
            return IOS;
        }

        return OTHER;
    }


    /**
     * Add Event Listeners
     */
    function addEventListeners() {

        switch (platform) {

            case MICROSOFT:
                document.addEventListener('MSGestureInit', function(event) {
                    if (event.preventManipulation) {
                        event.preventManipulation();
                    }
                });

                //MS Gesture Events
                context.addEventListener('MSPointerDown', dragStartHandler);
                context.addEventListener('MSPointerMove', dragMoveHandler);
                context.addEventListener('MSPointerUp', dragStopHandler);
                context.addEventListener('MSPointerCancel', dragStopHandler);

                context.addEventListener('MSGestureStart', onMSGestureStart);
                context.addEventListener('MSGestureChange', onMSGestureChange);
                context.addEventListener('MSGestureEnd', onMSGestureEnd);

                context.addEventListener('MSGestureHold', msGestureHold);
                context.addEventListener('MSGestureTap', onMSGestureTap);
                context.addEventListener('MSInertiaStart', onMSInertiaStart);

                // Prevented Events
                document.addEventListener('contextmenu', preventDefault);
                document.addEventListener('MSHoldVisual', preventDefault);
                document.addEventListener('selectstart', preventDefault);
            break;

            case IOS:
                // iOS Events
                context.addEventListener('touchstart', oniOSTouchStart);
                context.addEventListener('touchmove', oniOSTouchMove);
                document.addEventListener('touchend', oniOSTouchEnd);
                document.addEventListener('touchcancel', oniOSTouchEnd);

                context.addEventListener('gesturestart', oniOSGestureStart);
                context.addEventListener('gesturechange', oniOSGestureChange);
                context.addEventListener('gestureend', oniOSGestureEnd);
            break;

            default:
                // Mouse events
                context.addEventListener('mousedown', mouseDragStartHandler);
            break;
        }
    }


    /**
     * Remove Event Listeners
     */
    function removeEventListeners() {
    }


    /**
     * iOS touch event handlers
     *
     *  Touch event properties:
     *      touches:          Array of touch objects for every finger currently touching the screen
     *      targetTouches:    Array of touch objects for every finger touching the screen that
     *                        originally touched down on the DOM object the transmitted the event.
     *      changedTouches:   Array of touch objects for touches that are changed for this event.
     *
     *  Touch objects:
     *      identifier: An identifying number, unique to each touch event
     *      target: DOM object that broadcast the event
     *      clientX: X coordinate of touch relative to the viewport (excludes scroll offset)
     *      clientY: Y coordinate of touch relative to the viewport (excludes scroll offset)
     *      screenX: Relative to the screen
     *      screenY: Relative to the screen
     *      pageX: Relative to the full page (includes scrolling)
     *      pageY: Relative to the full page (includes scrolling)
     */
    function oniOSTouchStart(event) {
        for (var i = 0; i < event.touches.length; i++) {
            var touchObject = event.touches[i];
            var touchPoint = addTouchPoint(touchObject.identifier, touchObject.clientX - offset.left, touchObject.clientY - offset.top);
            var event = document.createEvent('Event');
            event.initEvent('touchstart', true, true);
            event.touchPoint = touchPoint;
        };
    }


    function oniOSTouchEnd(event) {
        if (event.touches.length === 0) {
            removeAllTouchPoints()
        } else {
            // Remove touch points (chachged touches)
            for (var i = 0; i < event.changedTouches.length; i++) {
                var touchObject = event.changedTouches[i];
                removeTouchPoint(touchObject.identifier);
            };
        }
    }


    function oniOSTouchMove(event) {
        preventDefault(event);
        for (var i = 0, numTouches = event.touches.length; i < numTouches; i++) {
            var touchObject = event.touches[i];
            updateTouchPoint(touchObject.identifier, touchObject.clientX - offset.left, touchObject.clientY - offset.top);
        };

        // Detect swipe
        detectSwipe(event);
    }


    /**
     * MS Gesture Touch events
     */
    function dragStartHandler(event) {
        msGesture.addPointer(event.pointerId);
        return addTouchPoint(event.pointerId, event.clientX - offset.left, event.clientX - offset.top);
    }

    function dragStopHandler(event) {
        removeTouchPoint(event.pointerId);
    }

    function dragMoveHandler(event) {
        var x = event.clientX - offset.left;
        var y = event.clientY - offset.top;
        updateTouchPoint(event.pointerId, x, y);

        // Detect swipe
        detectSwipe(event);
    }


    /**
     * Mouse fallback events (no multi-touch capabilities)
     */
    function mouseDragStartHandler(event) {
        preventDefault(event);
        context.addEventListener('mousemove', mouseDragMoveHandler);
        document.addEventListener('mousemove', mouseDragMoveDocumentHandler);
        document.addEventListener('mouseup', mouseDragStopHandler);

        resetGesture();

        var x = event.pageX - offset.left;
        var y = event.pageY - offset.top;
        return addTouchPoint(++mouseId, x, y);
    }


    function mouseDragMoveHandler(event) {
        preventDefault(event);
        var x = event.pageX - offset.left;
        var y = event.pageY - offset.top;
        updateTouchPoint(mouseId, x, y);

        // Detect swipe
        detectSwipe(event);
    }


    function mouseDragMoveDocumentHandler(event) {
        preventDefault(event);

        var x = event.pageX - offset.left;
        var y = event.pageY - offset.top;

        mouseOutside = x < 0 || x > context.offsetWidth || y < 0 || y > context.offsetHeight;

        if (!mouseOutside) {
            addTouchPoint(mouseId, x, y);
            updateTouchPoint(mouseId, x, y);
        } else {
            removeTouchPoint(mouseId);
        }
    }


    function mouseDragStopHandler(event) {
        context.removeEventListener('mousemove', mouseDragMoveHandler);
        document.removeEventListener('mouseup', mouseDragStopHandler);
        document.removeEventListener('mousemove', mouseDragMoveDocumentHandler);
        removeTouchPoint(mouseId);
    }


    /**
     * iOS event handlers
     */
    function oniOSGestureStart(event) {
        resetGesture();
    }

    function oniOSGestureChange(event) {
        preventDefault(event);
        detectGesture(event, false);
    }

    function oniOSGestureEnd(event) {
        resetGesture();
    }


    /**
     * MSGesture event handlers
     */
    function onMSGestureStart(event) {
        resetGesture();
    }

    function onMSGestureChange(event) {
        // Disable the built-in inertia provided by dynamic gesture recognition
        if (event.detail == event.MSGESTURE_FLAG_INERTIA && DISABLE_INERTIA) {
            return;
        }

        detectGesture(event, true);
    }

    function onMSInertiaStart(event) {
        var x = event.clientX - offset.left;
        var y = event.clientY - offset.top;

        mouseOutside = x < 0 || x > context.offsetWidth || y < 0 || y > context.offsetHeight;

        if (mouseOutside) {
            removeAllTouchPoints()
        }

        // console.log('onMSInertiaStart');
    }

    function onMSGestureEnd(event) {
        resetGesture();
    }

    function onMSGestureTap(event) {
        recognized = true;
        detectedGesture = app.touch.gesture.TAP;
    }

    function msGestureHold(event) {
        preventDefault(event);

        if (event.detail === event.MSGESTURE_FLAG_BEGIN) {
            // HOLD_START
            console.log('hold start');
        } else if (event.detail === event.MSGESTURE_FLAG_END) {
            // HOLD_END
            console.log('hold end');
        } else if (event.detail === event.MSGESTURE_FLAG_CANCEL) {
            // HOLD_CANCEL / NONE
            console.log('hold cancel');
        }
    }


    /**
     * Gesture reset
     */
    function resetGesture() {
        rotation = 0;
        scale = 1;
        recognized = false;
        detectedSwipe = app.touch.direction.NONE;
        detectedGesture = app.touch.gesture.NONE;
        gestureTime = 0;
        swipeX = 0;
        swipeY = 0;
    }


    /**
     * Remove all touch points
     */
    function removeAllTouchPoints() {
        for (var i = keys.length - 1; i >= 0; i--) {
            removeTouchPoint(keys[i]);
        };
    }


    /**
     * Swipe detection
     */
    function detectSwipe(event) {

        // Quit if swipe already detected
        if (detectedGesture === app.touch.gesture.SWIPE) {
            return;
        }

        // Detect one finger swipe
        if (keys.length === 1) {
            var finger = pointers[keys[0]];

            swipeX += finger.deltaX;
            swipeY += finger.deltaY;

            var swipeAbsX = Math.abs(finger.deltaX);
            var swipeAbsY = Math.abs(finger.deltaY);

            if (Math.abs(swipeX) > MIN_SWIPE_DISTANCE && swipeAbsX > swipeAbsY) {
                // Horizontal swipe
                if (finger.deltaX > 0) {
                    detectedSwipe = app.touch.direction.LEFT;
                } else {
                    detectedSwipe = app.touch.direction.RIGHT;
                }
            }

            else if (Math.abs(swipeY) > MIN_SWIPE_DISTANCE && swipeAbsY > swipeAbsX) {
                // Vertical swipe
                if (finger.deltaY > 0) {
                    detectedSwipe = app.touch.direction.UP;
                } else {
                    detectedSwipe = app.touch.direction.DOWN;
                }
            }

            else {
                recognized = false;
                detectedSwipe = app.touch.direction.NONE;
            }
        }

        if (detectedSwipe !== app.touch.direction.NONE) {
            recognized = true;
            detectedGesture = app.touch.gesture.SWIPE;
        }
    }


    /**
     * Gesture detection
     */
    function detectGesture(event, relative) {

        currentTime = (new Date()).getTime();

        if (detectedGesture === app.touch.gesture.NONE) {
            initialTime = (new Date()).getTime();
        }

        gestureTime = currentTime - initialTime;

        // Max gesture time exceeded
        if (gestureTime > MAX_GESTURE_TIME) {
            resetGesture();
        }

        // Check if event properties are relative
        if (relative) {
            // Set minimum threshold for rotation
            if (Math.abs(event.rotation * 180 / Math.PI) > 0.1) {
                rotation += event.rotation * 180 / Math.PI;
            }
            scale *= event.scale;
        } else {
            // iOS
            rotation = event.rotation;
            scale = event.scale;
        }

        if (!recognized) {

            // Palm gesture
            if (keys.length >= MIN_PALM_POINTS) {
                recognized = true;
                detectedGesture = app.touch.gesture.PALM;
            }

            // Scratch gesture
            else if (keys.length == 2) {
                // The first finger shouldn't move more then 20 pixels,
                // the second finger needs to travel more than 300 pixels
                if (pointers[keys[0]].totalDistance < 20 && pointers[keys[1]].totalDistance > 300) {
                    recognized = true;
                    detectedGesture = app.touch.gesture.SCRATCH;
                }
            }

            // Min distance condition assumes touch points are moving,
            // thus we can differentiate between scratch and stretch/pinch/rotate
            var minDistance = true;

            for (var i = keys.length - 1; i >= 0; i--) {
                if (pointers[keys[i]].totalDistance < 20) {
                    minDistance = false;
                }
            };

            // Touch points moved enough
            if (minDistance) {
                // Rotate gesture
                if (Math.abs(rotation) >= MIN_GESTURE_ROTATION) {
                    recognized = true;
                    detectedGesture = app.touch.gesture.ROTATE;
                }
                // Pinch/Stretch gesture
                else if (Math.abs(scale - 1) > MIN_GESTURE_SCALE) {
                    recognized = true;
                    detectedGesture = scale > 1 ? app.touch.gesture.STRETCH : app.touch.gesture.PINCH
                }
            }
        }
    }


    /**
     * Add touch point
     */
    function addTouchPoint(id, x, y) {
        // Store new pointer id
        if (keys.indexOf(id) === -1) {
            if (typeof pointers[id] == 'undefined') {
                keys.push(id);
                var touchPoint = {
                    pointerId: id,
                    clientX: x,
                    clientY: y,
                    deltaX: 0,
                    deltaY: 0,
                    distance: 0,
                    totalDistance: 0,
                    angle: 0
                }
                pointers[id] = touchPoint;
                return touchPoint;
            }
        }
    }


    /**
     * Update touch point
     */
    function updateTouchPoint(id, x, y) {
        pointer = pointers[id];
        if (pointer === undefined) return;

        // Check if previous position has been defined
        if (pointer.prevX !== undefined && pointer.prevY !== undefined) {
            // Calculate deltas and distances
            pointer.deltaX = pointer.prevX - x;
            pointer.deltaY = pointer.prevY - y;
            pointer.angle = Math.atan2(pointer.deltaY, pointer.deltaX);
            pointer.distance = Math.sqrt(pointer.deltaX * pointer.deltaX + pointer.deltaY * pointer.deltaY);
            pointer.totalDistance += pointer.distance;
            pointer.prevX = pointer.clientX;
            pointer.prevY = pointer.clientY;
        } else {
            // First time, assign prev values to current ones
            pointer.prevX = x;
            pointer.prevY = y;
        }

        // Update values
        pointer.clientX = x;
        pointer.clientY = y;
    }


    /**
     * Remove touch point
     */
    function removeTouchPoint(id) {
        delete pointers[id];
        var index = keys.indexOf(id);
        keys.splice(index, 1);
    }


    /**
     * Utils
     */
    function getAbsolutePosition(element) {
        var left = 0;
        var top = 0;
        while (element) {
            left += element.offsetLeft;
            top += element.offsetTop;
            element = element.offsetParent;
        }
        return {
            left: left,
            top: top
        };
    }

    function preventDefault(event) {
        event.preventDefault();
    }


    /**
     *  Expose API
     */
    return {

        // Methods
        init: init,

        // Getters
        getNumTouchPoints: function() {
            return keys.length;
        },

        getTouchPoint: function(id) {
            return pointers[keys[id]];
        },

        getRotation: function() {
            return rotation;
        },

        getScale: function() {
            return scale;
        },

        getGesture: function() {
            return detectedGesture;
        },

        getSwipe: function() {
            return detectedSwipe;
        },

        getGestureTime: function() {
            return gestureTime;
        }
    };

})();
