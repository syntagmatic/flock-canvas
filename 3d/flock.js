// Copyright © Richard Poole 2010: http://sycora.com/
// Algorithm by Craig Reynolds: http://www.red3d.com/cwr/boids/
// Licence for this file: http://creativecommons.org/licenses/MIT/

Math.dotProduct2 = function(ax, ay, az, bx, by, bz) {
  return ax * bx + ay * by + az * bz;
}

function FlockController(canvas, options) {
  // Settings for the flocking algorithm.
  var defaults = {
    alignmentPriority: 2,
    cohesionPriority: 1,
    frameRate: 50,
    maxRotation: 30 * Math.PI / 180,
    minSpeed: 3,
    maxSpeed: 5,
    numBoids: 42,
    rotationSpeed: 0.2,
    separationDistance: 20,
    separationPriority: 5,
    targetPriority: 2,
    torus: true,
    visualField: Math.PI * 270 / 180,
    visualRange: 50,
  };

  var boids = new Array();
    var cosVisualFieldDiv2;
    var redrawInterval;
    var settings = {};
  var targetX = canvas.width / 2;
  var targetY = canvas.height / 2;
  var targetZ = 0;
    var timer;
    var visualRangeSqr;
    
  if (!canvas.getContext)
    throw new Error('Canvas is not supported by your browser.');

  var ctx = canvas.getContext('2d');

  if (options.parallel) {
    var pll = options.parallel.getContext('2d');
  }

  var drawBoid = function(boid) {
    var color = 'hsl(' + Math.round(360*boid.z/canvas.height) + ',50%,50%)';
    ctx.fillStyle = color;
    pll.strokeStyle = color;

    ctx.fillRect(boid.x, boid.y, 4, 4);

    // velocity vector
    /*
    ctx.strokeStyle = "rgba(0,225,0,0.4)";
    ctx.beginPath();
    ctx.moveTo(boid.x, boid.y);
    ctx.lineTo(boid.x + boid.vx * 10, boid.y + boid.vy * 10);
    ctx.stroke();
    */

    // parallel coordinates
    pll.beginPath();
    pll.moveTo(000,190-(boid.x/canvas.width*190))
    pll.lineTo(345,boid.y/canvas.height*190)
    pll.lineTo(690,boid.z/canvas.height*190)
    pll.moveTo(0,400-(50*boid.vx+95))
    pll.lineTo(345,400-(50*boid.vy+95))
    pll.lineTo(690,400-(50*boid.vz+95))
    pll.stroke();
  }

  var getVisualStats = function(boid) {
    var stats = {x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, closestDistance: 999999999};
    var count = 0;
    for (var i in boids) {
      if (boids[i] == boid)
        continue;

      var dx = boids[i].x - boid.x;
      var dy = boids[i].y - boid.y;
      var dz = boids[i].z - boid.z;

      var distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (distance < stats.closestDistance) {
        stats.closestDistance = distance;
        stats.closestBoid = boids[i];
      }

      var ndx = dx / distance;
      var ndy = dy / distance;
      var ndz = dz / distance;

      var cosθ = Math.dotProduct2(Math.cos(boid.θ), Math.sin(boid.θ), Math.sin(boid.θ), ndx, ndy, ndz);

      if (dx * dx + dy * dy + dz * dz <= visualRangeSqr && cosθ >= cosVisualFieldDiv2) {
        stats.x += boids[i].x;
        stats.y += boids[i].y;
        stats.z += boids[i].z;
        stats.vx += boids[i].vx;
        stats.vy += boids[i].vy;
        stats.vz += boids[i].vz;
        stats.count++;
      }
    }

    stats.x /= count;
    stats.y /= count;
    stats.z /= count;
    stats.θ = Math.atan2(stats.vy, stats.vx);
    return stats;
  }

  this.animateFrame = function() {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    pll.globalCompositeOperation = "source-over";
    pll.fillStyle = 'rgba(255,255,255,0.12)';
    pll.fillRect(0, 0, 690, 400);

        ctx.fillStyle = 'rgba(0,100,200,0.03)';
        ctx.beginPath();
        ctx.arc(targetX, targetY, 30, 0, Math.PI * 2, true);
        ctx.fill();

    // parallel marks
    // velocity
    pll.fillStyle= 'rgba(0,0,0,0.2)';
    pll.font = 'bold 12px sans-serif';
    // labels
    pll.fillText('x',000,180)
    pll.fillText('y',345,180)
    pll.fillText('hue',660,180)
    pll.fillText('vx',0,380)
    pll.fillText('vy',345,380)
    pll.fillText('vhue',660,380)
    pll.stroke();
    // target
    pll.strokeStyle = 'rgba(0,100,200,0.1)';
    pll.lineWidth = 4;
    pll.beginPath();
    pll.moveTo(0,190-(targetX/canvas.width*190))
    pll.lineTo(345,targetY/canvas.height*190)
    pll.stroke();

    pll.strokeStyle = 'rgba(0,0,0,0.2)';
    pll.lineWidth= 1;
    pll.globalCompositeOperation = "darker";

    // Draw the boids!
    for (var i in boids)
      drawBoid(boids[i]);

    // Move the boids in a flocky way.
    for (i in boids) {
      var boid = boids[i];

      if (settings.torus) {
        // Make canvas a torus
        if (boid.x < 0) {
          boid.x += canvas.width;
        }
        if (boid.x > canvas.width) {
          boid.x -= canvas.width;
        }
        if (boid.y < 0) {
          boid.y += canvas.height;
        }
        if (boid.y > canvas.height) {
          boid.y -= canvas.height;
        }
        if (boid.z < 0) {
          boid.z += canvas.height;
        }
        if (boid.z > canvas.height) {
          boid.z -= canvas.height;
        }
      }

      var avg = getVisualStats(boid);
      var tx = boid.vx;
      var ty = boid.vy;
      var tz = boid.vz;

      // Steer to avoid crowding local flock mates.
      if (avg.closestBoid) {
        var dx = avg.closestBoid.x - boid.x;
        var dy = avg.closestBoid.y - boid.y;
        var dz = avg.closestBoid.z - boid.z;
        if (avg.closestDistance < settings.separationDistance) {
          tx -= dx / avg.closestDistance * settings.separationPriority;
          ty -= dy / avg.closestDistance * settings.separationPriority;
          tz -= dz / avg.closestDistance * settings.separationPriority;
        }
      }

      // Steer towards the average heading of local flock mates.
      tx += Math.cos(avg.θ) * settings.alignmentPriority;
      ty += Math.sin(avg.θ) * settings.alignmentPriority;
      tz += Math.sin(avg.θ) * settings.alignmentPriority;

      // Steer towards the average position of local flock mates.
      if (avg.count > 0) {
        var dx = avg.x - boid.x;
        var dy = avg.y - boid.y;
        var dz = avg.z - boid.z;
        var distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        var ndx = dx / distance;
        var ndy = dy / distance;
        var ndz = dz / distance;
        tx += ndx * settings.cohesionPriority;
        ty += ndy * settings.cohesionPriority;
        tz += ndz * settings.cohesionPriority;
      }

      // Steer towards the target.
      var dx = targetX - boid.x;
      var dy = targetY - boid.y;
      var dz = targetZ - boid.z;
      var distance = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), 30);
      var ndx = dx / distance;
      var ndy = dy / distance;
      var ndz = dz / distance;
      tx += ndx * settings.targetPriority;
      ty += ndy * settings.targetPriority;
      tz += ndz * settings.targetPriority;

      var tθ = Math.atan2(ty, tx);
      var cw = (tθ - boid.θ + Math.PI * 4) % (Math.PI * 2);
      var acw = (boid.θ - tθ + Math.PI * 4) % (Math.PI * 2);
      var rotation = Math.abs(cw) < Math.abs(acw) ? cw : -acw;
      rotation *= settings.rotationSpeed;
      rotation = Math.min(Math.max(rotation, -settings.maxRotation), settings.maxRotation);
      boid.θ += rotation;
      boid.updateVelocity();

      boid.updatePosition();
    }
  };

  this.setTarget = function(x, y) {
    targetX = x;
    targetY = y;
    targetZ = 0;
  }

  this.startAnimation = function() {
    timer = window.setInterval(this.animateFrame, redrawInterval);
  };
    
    this.stopAnimation = function() {
        window.clearInterval(timer);
    };

    this.updateOptions = function(options) {
        $.extend(settings, options);

        var newRedrawInterval = 1000 / settings.frameRate;
        if (redrawInterval != newRedrawInterval) {
            if (timer)
                this.stopAnimation();

            redrawInterval = newRedrawInterval;
            this.startAnimation();
        }

        cosVisualFieldDiv2 = Math.cos(settings.visualField / 2);
        visualRangeSqr = settings.visualRange * settings.visualRange;

        while (boids.length < settings.numBoids)
      boids.push(new Boid(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * canvas.height, Math.random() * Math.PI * 2, settings.minSpeed + Math.random(settings.maxSpeed - settings.minSpeed)));

        while (boids.length > settings.numBoids)
            boids.pop();
    };

    this.updateOptions(defaults);
    this.updateOptions(options);
}

function Boid(x, y, z, θ, speed) {
  this.x = x;
  this.y = y;
  this.z = z;
  this.θ = θ;
  this.speed = speed;

  this.updatePosition = function() {
    this.x += this.vx * this.speed;
    this.y += this.vy * this.speed;
    this.z += this.vz * this.speed;
  };

  this.updateVelocity = function() {
    this.vx = Math.cos(this.θ);
    this.vy = Math.sin(this.θ);
    this.vz = Math.sin(this.θ);
  };

  this.updateVelocity();
}
