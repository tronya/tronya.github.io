export interface DOT {
  dotCircle: SVGElement;
  initialPosition: { cx: number; cy: number };
  cx: number;
  cy: number;
  radius: number;
  color: string;
  direction: number;

  velocityX: number;
  velocityY: number;
}

export class Dot implements DOT {
  cx: number;
  cy: number;
  radius: number;
  initialPosition: { cx: number; cy: number };
  color: string;
  dotCircle: SVGElement;
  direction: number;
  velocityX: number;
  velocityY: number;

  constructor(
    private position: { cx: number; cy: number },
    radius: number,
    color: string = '#00ff00'
  ) {
    this.cx = position.cx;
    this.cy = position.cy;
    this.radius = radius;
    this.initialPosition = { cx: position.cx, cy: position.cy };
    this.color = color;
    this.direction = Math.random();
    this.velocityX = Math.random() * 20;
    this.velocityY = Math.random() * 20;

    //
    const dot = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    );
    dot.setAttribute('fill', this.color);
    dot.setAttribute('r', this.radius.toString());
    dot.setAttribute('cx', this.cx.toString());
    dot.setAttribute('cy', this.cy.toString());

    this.dotCircle = dot;
  }
}


