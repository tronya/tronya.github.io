import { DOT, Dot } from './dot';
import { BlackHole } from './black-hole';
import { QRCODE_JAR } from './helpers/qr-code';

export class Particles {
  dots: DOT[] = [];
  blackHole = new BlackHole(window.innerWidth / 2, window.innerHeight / 2, 200);

  constructor(count: number) {
    this.dots = this.createDots(count);
  }

  getDots() {
    return this.dots;
  }

  createDots(count: number): DOT[] {
    const dots: DOT[] = [];
    for (let i = 0; i < count; i++) {
      const position = { cx: 50, cy: 100 };
      const dot = new Dot(position, 1);
      dots.push(dot);
    }

    return dots;
  }

  run() {
    let change = false;
    setTimeout(() => {
      change = !change;
    }, 5000);
    const loop = () => {
      this.updates(change);
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  draw() {
    this.dots.map((dot) => {
      dot.dotCircle.setAttribute('cx', dot.cx.toString());
      dot.dotCircle.setAttribute('cy', dot.cy.toString());
    });
  }

  moveForBlackHole() {
    this.blackHole.move();
    const { x: bhx, y: bhy, radius: bhradius } = this.blackHole;

    this.dots.forEach((dot, i) => {
      const vectorX = bhx - dot.cx;
      const vectorY = bhy - dot.cy;

      const distance = Math.sqrt(vectorX * vectorX + vectorY * vectorY);

      // Calculate the force magnitude
      let forceMagnitude = bhradius / distance; // Adjust as needed for desired speed

      // Calculate the acceleration components
      const accelerationX = (vectorX / distance) * forceMagnitude;
      const accelerationY = (vectorY / distance) * forceMagnitude;

      // Integrate to get velocity
      dot.velocityX += accelerationX;
      dot.velocityY += accelerationY;

      // Integrate to get position
      dot.cx += dot.velocityX;
      dot.cy += dot.velocityY;
    });
  }

  updates(change: boolean) {
    if (!change) {
      this.moveForBlackHole();
    } else {
      this.moveToMatrix(QRCODE_JAR);
      // this.moveParticlesTowardsCenter();
    }
  }

  moveToMatrix(matrix: number[][]) {
    const totalParticles = this.dots.length;
  
    // Step 2: Calculate the number of '1's in the QR code matrix
    const numOnes = matrix.reduce(
      (acc, row) => acc + row.reduce((rowAcc, cell) => rowAcc + cell, 0),
      0
    );
  
    // Step 3: Calculate the desired number of particles per '1' position
    const particlesPerOne = totalParticles / numOnes;
  
    let currentIndex = 0; // Keep track of the current particle index
  
    // Step 4: Iterate over the QR code matrix
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x] === 1) {
          // Step 5: Distribute particles evenly within the space allocated for that position
          const centerX = (x + 0.5) * 5; // Assuming each module takes 5px
          const centerY = (y + 0.5) * 5;
  
          // Distribute particles gradually
          const particlesInThisPosition = this.dots.slice(
            currentIndex,
            currentIndex + particlesPerOne
          );
          particlesInThisPosition.forEach((particle, index) => {
            // Calculate the distance to the target position
            const vectorX = centerX - particle.cx;
            const vectorY = centerY - particle.cy;
            const distance = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
  
            // Adjust the speed based on distance
            let speedFactor = Math.min(1, 5000 / (distance * 60)); // Adjust the '5000' value to control the speed
  
            // Increase speedFactor for particles far from the target position
            speedFactor = Math.pow(speedFactor, 0.1);
  
            // Move particle towards the target position using adjusted velocity components
            particle.velocityX = vectorX / distance * speedFactor;
            particle.velocityY = vectorY / distance * speedFactor;
  
            // Integrate to get position
            particle.cx += particle.velocityX;
            particle.cy += particle.velocityY;
          });
  
          currentIndex += particlesPerOne; // Move to the next set of particles
        }
      }
    }
  }
  

  moveParticlesTowardsCenter() {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    this.dots.forEach((particle) => {
      // Calculate vector towards the center
      const vectorX = centerX - particle.cx;
      const vectorY = centerY - particle.cy;

      // Calculate distance to the center
      const distance = Math.sqrt(vectorX * vectorX + vectorY * vectorY);

      // Scale down velocity as the particle approaches the center
      const scale = 1 / distance; // Inverse relationship: closer particles have lower scale
      const scaledVectorX = vectorX * scale;
      const scaledVectorY = vectorY * scale;

      // Update particle position using previous velocity
      particle.cx += scaledVectorX * particle.velocityX;
      particle.cy += scaledVectorY * particle.velocityY;
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
