// Copyright © Richard Poole 2010: http://sycora.com/
// Algorithm by Craig Reynolds: http://www.red3d.com/cwr/boids/
// Licence for this file: http://creativecommons.org/licenses/MIT/

Math.dotProduct2 = function(ax, ay, bx, by) {
  return ax * bx + ay * by;
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
    numBoids: 30,
    rotationSpeed: 0.2,
    separationDistance: 20,
    separationPriority: 5,
    targetPriority: 3,
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
    var timer;
    var visualRangeSqr;
    
  if (!canvas.getContext)
    throw new Error('Canvas is not supported by your browser.');

  var ctx = canvas.getContext('2d');

  if (options.parallel) {
    var pll = options.parallel.getContext('2d');
  }

  var drawBoid = function(boid) {
    ctx.fillRect(boid.x, boid.y, 2.5, 2.5);

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
    pll.moveTo(100,190-(boid.x/canvas.width*190))
    pll.lineTo(300,boid.y/canvas.height*190)
    pll.moveTo(400,190-(50*boid.vx+95))
    pll.lineTo(600,50*boid.vy+95)
    pll.stroke();
  }

  var getVisualStats = function(boid) {
    var stats = {x: 0, y: 0, vx: 0, vy: 0, closestDistance: 999999999};
    var count = 0;
    for (var i in boids) {
      if (boids[i] == boid)
        continue;

      var dx = boids[i].x - boid.x;
      var dy = boids[i].y - boid.y;

      var distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < stats.closestDistance) {
        stats.closestDistance = distance;
        stats.closestBoid = boids[i];
      }

      var ndx = dx / distance;
      var ndy = dy / distance;

      var cosθ = Math.dotProduct2(Math.cos(boid.θ), Math.sin(boid.θ), ndx, ndy);

      if (dx * dx + dy * dy <= visualRangeSqr && cosθ >= cosVisualFieldDiv2) {
        stats.x += boids[i].x;
        stats.y += boids[i].y;
        stats.vx += boids[i].vx;
        stats.vy += boids[i].vy;
        stats.count++;
      }
    }

    stats.x /= count;
    stats.y /= count;
    stats.θ = Math.atan2(stats.vy, stats.vx);
    return stats;
  }

  this.animateFrame = function() {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    pll.globalCompositeOperation = "source-over";
    pll.fillStyle = 'rgba(255,255,255,0.12)';
    pll.fillRect(0, 0, 690, 190);

        ctx.fillStyle = 'rgba(0,100,200,0.03)';
        ctx.beginPath();
        ctx.arc(targetX, targetY, 30, 0, Math.PI * 2, true);
        ctx.fill();

    // Draw the boids!
    ctx.fillStyle = 'black';

    // parallel marks
    // velocity
    pll.strokeStyle = 'rgba(200,0,0,0.01)';
    pll.fillStyle= 'rgba(200,0,0,0.5)';
    pll.font = 'bold 12px sans-serif';
    pll.beginPath()
    pll.moveTo(400,95)
    pll.lineTo(600,95)
    pll.stroke();
    // labels
    pll.fillText('x',100,180)
    pll.fillText('y',300,180)
    pll.fillText('vx',400,180)
    pll.fillText('vy',600,180)
    pll.stroke();
    // target
    pll.strokeStyle = 'rgba(0,100,200,0.1)';
    pll.lineWidth = 4;
    pll.beginPath();
    pll.moveTo(100,190-(targetX/canvas.width*190))
    pll.lineTo(300,targetY/canvas.height*190)
    pll.stroke();

    pll.strokeStyle = 'rgba(0,0,0,0.2)';
    pll.lineWidth= 1;
    pll.globalCompositeOperation = "darker";
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
      }

      var avg = getVisualStats(boid);
      var tx = boid.vx;
      var ty = boid.vy;

      // Steer to avoid crowding local flock mates.
      if (avg.closestBoid) {
        var dx = avg.closestBoid.x - boid.x;
        var dy = avg.closestBoid.y - boid.y;
        if (avg.closestDistance < settings.separationDistance) {
          tx -= dx / avg.closestDistance * settings.separationPriority;
          ty -= dy / avg.closestDistance * settings.separationPriority;
        }
      }

      // Steer towards the average heading of local flock mates.
      tx += Math.cos(avg.θ) * settings.alignmentPriority;
      ty += Math.sin(avg.θ) * settings.alignmentPriority;

      // Steer towards the average position of local flock mates.
      if (avg.count > 0) {
        var dx = avg.x - boid.x;
        var dy = avg.y - boid.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        var ndx = dx / distance;
        var ndy = dy / distance;
        tx += ndx * settings.cohesionPriority;
        ty += ndy * settings.cohesionPriority;
      }

      // Steer towards the target.
      var dx = targetX - boid.x;
      var dy = targetY - boid.y;
      var distance = Math.max(Math.sqrt(dx * dx + dy * dy), 30);
      var ndx = dx / distance;
      var ndy = dy / distance;
      tx += ndx * settings.targetPriority;
      ty += ndy * settings.targetPriority;

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
      boids.push(new Boid(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * Math.PI * 2, settings.minSpeed + Math.random(settings.maxSpeed - settings.minSpeed)));

        while (boids.length > settings.numBoids)
            boids.pop();
    };

    this.updateOptions(defaults);
    this.updateOptions(options);
}

function Boid(x, y, θ, speed) {
  this.x = x;
  this.y = y;
  this.θ = θ;
  this.speed = speed;

  this.updatePosition = function() {
    this.x += this.vx * this.speed;
    this.y += this.vy * this.speed;
  };

  this.updateVelocity = function() {
    this.vx = Math.cos(this.θ);
    this.vy = Math.sin(this.θ);
  };

  this.updateVelocity();
}
