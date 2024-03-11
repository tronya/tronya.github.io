const colors = ['#6C22A6', '#6962AD', '#83C0C1', '#96E9C6', '#fff'];
export interface IResponse {
  amount: number;
  goal: number;
  ownerIcon: string;
  title: string;
  ownerName: string;
  currency: number;
  description: string;
  jarId: string;
  blago: boolean;
  closed: boolean;
}

export class Particle {
  x: number;
  y: number;
  dest: { x: number; y: number };
  r: number;
  vx: number;
  vy: number;
  accX: number;
  accY: number;
  friction: number;
  color: string;
  radius: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.dest = {
      x: x,
      y: y,
    };
    this.r = Math.random() * 5 + 2;
    this.vx = (Math.random() - 0.5) * 20;
    this.vy = (Math.random() - 0.5) * 20;
    this.accX = 0;
    this.accY = 0;
    this.friction = Math.random() * 0.05 + 0.94;
    this.radius = 1;

    this.color = colors[Math.floor(Math.random() * 6)];
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.accX = (this.dest.x - this.x) / 1000;
    this.accY = (this.dest.y - this.y) / 1000;
    this.vx += this.accX;
    this.vy += this.accY;
    this.vx *= this.friction;
    this.vy *= this.friction;

    this.x += this.vx;
    this.y += this.vy;

    
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2, false); // Corrected arguments
    ctx.fill();

    const a = this.x;
    const b = this.y;

    const distance = Math.sqrt(a * a + b * b);
    if (distance < this.radius * 70) {
      this.accX = this.x / 100;
      this.accY = this.y / 100;
      this.vx += this.accX;
      this.vy += this.accY;
    }
  }
}
