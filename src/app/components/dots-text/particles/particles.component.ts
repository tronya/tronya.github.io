import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  BehaviorSubject,
  Subject,
  debounceTime,
  interval,
  map,
  switchMap,
} from 'rxjs';
import { QRCODE_JAR } from '../../ui/canva/helpers/qr-code';
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

  action$ = new BehaviorSubject(null);
  stream$ = this.action$.pipe(
    debounceTime(60000),
    switchMap(() => this.loopMethods$)
  );
  loopMethods$ = interval(60000).pipe(
    map((second) => (second % 2 ? this.updateNumbers() : this.updateToQR()))
  );

  constructor() {
    this.stream$.subscribe((res) => console.log(res));
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (this.ctx) {
      console.log(this.ctx);
      this.action$.next(null);
      this.initScene();
    }
  }

  ngAfterViewInit(): void {
    this.ctx = this.sceneCanvas.nativeElement.getContext('2d')!;
    this.initScene();
    this.draw();
  }

  private initScene(text: string = this.amount): void {
    const canvas = this.sceneCanvas.nativeElement;
    const ctx = this.ctx;

    const ww = (canvas.width = window.innerWidth);
    const wh = (canvas.height = window.innerHeight);

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    ctx.font = 'bold ' + ww / 4 + 'px Roboto';
    ctx.textAlign = 'center';
    ctx.fillText(text, ww / 2, wh / 1.5);

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
  }

  private updateNumbers(text: string = this.amount): void {
    const canvas = this.sceneCanvas.nativeElement;
    const ctx = this.ctx;

    const ww = (canvas.width = window.innerWidth);
    const wh = (canvas.height = window.innerHeight);

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    ctx.font = 'bold ' + ww / 4 + 'px Roboto';
    ctx.textAlign = 'center';
    ctx.fillText(text, ww / 2, wh / 1.5);

    const data = ctx.getImageData(0, 0, ww, wh).data;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'screen';

    let particleIndex = 0; // Індекс частки, яку ми оновлюємо
    for (let i = 0; i < ww; i += Math.round(ww / 150)) {
      for (let j = 0; j < wh; j += Math.round(ww / 150)) {
        if (data[(i + j * ww) * 4 + 3] > 150) {
          // this.particles.push(new Particle(i, j));
          const particle = this.particles[particleIndex];
          if (!particle) return;
          particle.dest.x = i;
          particle.dest.y = j;
          particle.r = Math.random() * 5 + 2;
          particleIndex++;
        }
      }
    }
  }
  private updateToQR(): void {
    const qrWidth = QRCODE_JAR[0].length;
    const qrHeight = QRCODE_JAR.length;
    const cellWidth = window.innerWidth / 2 / qrWidth;
    const qrX = window.innerWidth / 2 - (cellWidth * qrWidth) / 2;
    const qrY = window.innerHeight / 2 - (cellWidth * qrHeight) / 2;

    let particleIndex = 0; // Індекс частки, яку ми оновлюємо

    while (particleIndex < this.particles.length) {
      for (let i = 0; i < qrHeight; i++) {
        for (let j = 0; j < qrWidth; j++) {
          if (QRCODE_JAR[i][j] === 1) {
            if (particleIndex < this.particles.length) {
              const particle = this.particles[particleIndex];
              if (!particle) return;
              particle.dest.x = qrX + j * cellWidth + cellWidth / 2;
              particle.dest.y = qrY + i * cellWidth + cellWidth / 2;
              // particle.color = 'white';
              particle.r = 18;
              particleIndex++;
            } else {
              return; // Зупиняємо оновлення точок, якщо всі точки вже оновлені
            }
          }
        }
      }
    }
  }

  private randomDots() {
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      particle.dest.x = Math.random() * window.innerWidth;
      particle.dest.y = Math.random() * window.innerHeight;
    }
  }

  private draw(): void {
    const loop = () => {
      this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = 0; i < this.particles.length; i++) {
        this.particles[i].render(this.ctx);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
