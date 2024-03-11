export class BlackHole {
  x: number;
  y: number;
  radius: number;
  speed: number;
  direction: number;
  workingArea: { minX: number; minY: number; maxX: number; maxY: number };

  constructor(
    x: number,
    y: number,
    radius: number = 200,
    speed: number = 1,
    direction: number = 2
  ) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.speed = speed;
    this.direction = direction;
    // Define the working area
    this.workingArea = {
      minX: this.radius,
      minY: this.radius,
      maxX: window.innerWidth - this.radius - 100,
      maxY: window.innerHeight - this.radius - 100,
    };
  }

  move() {
    // Calculate new position based on current direction and speed
    const newX = this.x + Math.cos(this.direction) * this.speed;
    const newY = this.y + Math.sin(this.direction) * this.speed;

    // Check if the new position is within the working area
    if (
      newX >= this.workingArea.minX &&
      newX <= this.workingArea.maxX &&
      newY >= this.workingArea.minY &&
      newY <= this.workingArea.maxY
    ) {
      // Update position if within the working area
      this.x = newX;
      this.y = newY;
    } else {
      // If the new position exceeds the working area, change direction randomly
      this.direction = Math.random() * Math.PI * 2; // Random direction in radians (0 to 2*pi)
    }
  }

  getPosition() {
    return { x: this.x, y: this.y, radius: this.radius };
  }
}
