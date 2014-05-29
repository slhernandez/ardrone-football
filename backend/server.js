#!/usr/bin/env node
"use strict";
var http = require('http');
var send = require('send');
var dronestream = require('dronestream');
var path = require('path');
var frontendBuild = path.join(__dirname, '..', 'frontend', 'build');
var ws = require('ws');
var drone = require('ar-drone').createClient();
var starfox = require('starfox');

var server = http.createServer(function(req, res) {
  send(req, req.url, {root: frontendBuild}).pipe(res);
});
dronestream.listen(process.env.WS_PORT || 3001);

var wsServer = new ws.Server({server: server});
wsServer.on('connection', function(conn) {
  function send(msg) {
    conn.send(JSON.stringify(msg));
  }

  conn.on('message', function(msg) {
    try {
      msg = JSON.parse(msg);
    } catch (err) {
      console.log('err: '+err+': '+msg);
    }
    var kind = msg.shift();
    switch (kind) {
      case 'on':
        var event = msg.shift();
        drone.on(event, function(data) {
          send(['on', event, data]);
        });
        break;
      case 'takeoff':
        drone.takeoff(function() {
          send(['takeoff']);
        });
        break;
      case 'land':
        drone.land(function() {
          send(['land']);
        });
        break;
      case 'right':
        drone.right(msg[0]);
        break;
      case 'stop':
        drone.stop();
        break;
      default:
        console.log('unknown msg: '+kind);
        break;
    }
  });
});

starfox.mount(server);

function handleGamepadInput(gamepad) {
  // Axes
  //console.log(gamepad.axes);
  drone.right(gamepad.axes[0]); // Left/right
  drone.back(gamepad.axes[1]); // Forward/back
  drone.clockwise(gamepad.axes[2]); // Rotation
  drone.down(gamepad.axes[3]); // Up/down
  
  // Buttons
  //console.log(gamepad.buttons);
  if (gamepad.buttons[0].pressed) {
    drone.land();
  }
  
  if (gamepad.buttons[2].pressed) {
    drone.takeoff();
  }
}

starfox.on('connection', function(player) {
  player.on('input', function(gamepad) {
    handleGamepadInput(gamepad);
  });
  
  player.on('gamepadsChanged', function(gamepads) {
    console.log('gamepads changed ' + gamepads);
  });
});

server.listen(process.env.PORT || 3000);
