import { DOT, Dot } from './dot';
import { BlackHole } from './black-hole';
import { QRCODE_JAR } from './helpers/qr-code';

export class Particles {
  dots: DOT[] = [];
  blackHole = new BlackHole(window.innerWidth / 2, window.innerHeight / 2, 100);

  constructor(count: number, x: number, y: number, color: string) {
    this.dots = this.createDots(count, x, y, color);
  }

  getDots() {
    return this.dots;
  }

  createDots(count: number, x: number, y: number, color: string): DOT[] {
    const dots: DOT[] = [];
    for (let i = 0; i < count; i++) {
      const position = { cx: x + i / 4, cy: y + i / 4 };
      const dot = new Dot(position, 1, color);
      dots.push(dot);
    }

    return dots;
  }

  run() {
    let change = false;
    setInterval(() => {
      change = !change;
    }, 10000);
    const loop = () => {
      this.updates(change);
      this.draw();
      
      // this.clear();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  clear() {
    const ww = window.innerWidth;
    const wh = window.innerHeight;
    console.log(this.dots.length);
    this.dots = this.dots.filter((dot) => {
      return dot.cx >= 0 && dot.cx <= ww && dot.cy >= 0 && dot.cy <= wh;
    });
  }

  draw() {
    this.dots.map((dot) => {
      dot.dotCircle.setAttribute('cx', dot.cx.toString());
      dot.dotCircle.setAttribute('cy', dot.cy.toString());
    });
  }

  moveForBlackHole() {
    const { x: bhx, y: bhy, radius: bhradius } = this.blackHole;
    const maxDistance = 800; // Maximum distance for reversing direction
    const maxRadius = 1000; // Maximum distance from the black hole
    const spinForce = 0.00005; // Strength of the spin force

    this.dots.forEach((dot) => {
      const vectorX = bhx - dot.cx;
      const vectorY = bhy - dot.cy;

      const distance = Math.sqrt(vectorX * vectorX + vectorY * vectorY);

      // Limit the distance to not go beyond 1000px from the black hole
      const scaleFactor = maxRadius / distance;
      if (scaleFactor < 1) {
        dot.cx = bhx - vectorX * scaleFactor;
        dot.cy = bhy - vectorY * scaleFactor;
      }

      // Calculate the force magnitude
      const forceMagnitude = bhradius / 20 / distance;

      // Calculate the acceleration components
      const accelerationX = (vectorX / distance) * forceMagnitude;
      const accelerationY = (vectorY / distance) * forceMagnitude;

      // Add tangential force for spinning motion
      const tangentialForceX = -vectorY * spinForce;
      const tangentialForceY = vectorX * spinForce;

      // Integrate to get velocity
      dot.velocityX += accelerationX + tangentialForceX;
      dot.velocityY += accelerationY + tangentialForceY;

      // Reverse direction if the particle is more than 800px away from the black hole's center
      if (distance > maxDistance) {
        dot.velocityX = -dot.velocityX;
        dot.velocityY = -dot.velocityY;
      }

      // Integrate to get position
      dot.cx += dot.velocityX;
      dot.cy += dot.velocityY;
    });
  }

  updates(change: boolean) {
    if (!change) {
      this.moveForBlackHole();
    } else {
      // this.moveToMatrix(QRCODE_JAR);
      this.moveParticlesOnOrbit();
    }
  }

  moveParticlesOnOrbit() {
    const { x: planetX, y: planetY, radius: planetRadius } = this.blackHole;
    const orbitRadius = planetRadius + 100; // Radius of the orbit
    const gravitationalForce = 0.0001; // Adjust this value to control the strength of the gravitational force
    const pushForce = 0.0001; // Adjust this value to control the strength of the push force
    const maxPullForce = 0.001; // Maximum pull force
    const pullDistanceScale = 0.1; // Adjust this value to control the scale of pull force with distance
    const spinForce = 0.00005; // Strength of the spin force

    this.dots.forEach((dot) => {
      const distanceToCenter = Math.sqrt(
        Math.pow(dot.cx - planetX, 2) + Math.pow(dot.cy - planetY, 2)
      );

      if (distanceToCenter < orbitRadius) {
        // Particle is inside the orbit, push it away from the center
        const pushForceX = (dot.cx - planetX) * pushForce;
        const pushForceY = (dot.cy - planetY) * pushForce;

        dot.velocityX += pushForceX;
        dot.velocityY += pushForceY;
      } else {
        // Particle is outside the orbit, calculate pull force based on distance from orbit
        const distanceFromOrbit = Math.abs(distanceToCenter - orbitRadius);
        const pullForceMagnitude = Math.min(
          maxPullForce,
          gravitationalForce * distanceFromOrbit * pullDistanceScale
        );

        const pullForceX = (planetX - dot.cx) * pullForceMagnitude;
        const pullForceY = (planetY - dot.cy) * pullForceMagnitude;

        dot.velocityX += pullForceX;
        dot.velocityY += pullForceY;
      }

      // Add tangential force for spinning motion
      const vectorX = planetX - dot.cx;
      const vectorY = planetY - dot.cy;
      const tangentialForceX = -vectorY * spinForce;
      const tangentialForceY = vectorX * spinForce;

      // Integrate to get velocity
      dot.velocityX += tangentialForceX;
      dot.velocityY += tangentialForceY;

      // Update particle position based on velocity
      dot.cx += dot.velocityX;
      dot.cy += dot.velocityY;
    });
  }

  drawMatrix(
    // svg: HTMLElement,
    numberMatrix: number[][],
    dotSize: number,
    multiplierX: number,
    multiplierY: number,
    xOffset: number,
    yOffset: number
  ): DOT[] {
    const dots: DOT[] = [];

    // Loop through each row and column of the number matrix
    numberMatrix.forEach((row, i) => {
      row.forEach((digit, j) => {
        if (digit === 1) {
          // If the digit is 1, draw dots based on multipliers
          for (let k = 0; k < multiplierX; k++) {
            for (let l = 0; l < multiplierY; l++) {
              const cx = xOffset + (j * multiplierX + k) * (2 * dotSize + 2);
              const cy = yOffset + (i * multiplierY + l) * (2 * dotSize + 2);

              const dot = new Dot({ cx, cy }, 5);
              // svg.appendChild(dot.dotCircle);
              dots.push(dot);
            }
          }
        }
      });
    });

    return dots;
  }
}
