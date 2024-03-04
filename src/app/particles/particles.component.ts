import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Particle } from './particles.helper';

@Component({
  selector: 'particles',
  template: '<canvas #scene></canvas>',
  standalone: true,
})
export class ParticlesComponent implements AfterViewInit, OnChanges {
  @Input() public amount: string = '';
  @ViewChild('scene', { static: true })
  sceneCanvas!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private particlesAmount = 0;

  constructor() {}
  ngOnChanges(changes: SimpleChanges): void {
    if (this.ctx) {
      this.initScene();
    }
  }
  ngAfterViewInit(): void {
    this.ctx = this.sceneCanvas.nativeElement.getContext('2d')!;
    this.initScene();
    this.draw();
  }

  draw() {
    requestAnimationFrame(() => this.draw());
    this.ctx.clearRect(
      0,
      0,
      this.sceneCanvas.nativeElement.width,
      this.sceneCanvas.nativeElement.height
    );
    for (let i = 0; i < this.particlesAmount; i++) {
      this.particles[i].render(this.ctx);
    }
  }

  private initScene(): void {
    const canvas = this.sceneCanvas.nativeElement;
    const ctx = this.ctx;

    const ww = (canvas.width = window.innerWidth);
    const wh = (canvas.height = window.innerHeight);

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    ctx.font = 'bold ' + ww / 4 + 'px Roboto';
    ctx.textAlign = 'center';
    ctx.fillText(this.amount, ww / 2, wh / 1.5);

    const data = ctx.getImageData(0, 0, ww, wh).data;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'screen';

    this.particles = [];
    for (let i = 0; i < ww; i += Math.round(ww / 150)) {
      for (let j = 0; j < wh; j += Math.round(ww / 150)) {
        if (data[(i + j * ww) * 4 + 3] > 150) {
          this.particles.push(new Particle(i, j));
        }
      }
    }
    this.particlesAmount = this.particles.length;
  }
}
