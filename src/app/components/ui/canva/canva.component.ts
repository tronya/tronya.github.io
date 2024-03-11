import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
import { RxState } from '@rx-angular/state';
import { BehaviorSubject } from 'rxjs';
import { Particles } from './particles';

@Component({
  selector: 'canva',
  template: '<svg #svgContainer ></svg>',
  standalone: true,
})
export class CanvaComponent
  extends RxState<{ amount: number }>
  implements AfterViewInit
{
  @ViewChild('svgContainer') svgContainer!: ElementRef;
  @Input() set amount(amount: number) {
    this.set({ amount });
  }

  particles = new Particles(200, 500, 500, 'green');
  animate$ = new BehaviorSubject(0);

  constructor() {
    super();
    this.hold(this.select('amount'), (amount) => console.log(amount));
  }

  ngAfterViewInit(): void {
    this.prepareCanva();
    this.startAnimation();
  }

  prepareCanva() {
    const svg = this.svgContainer.nativeElement;
    const width = window.innerWidth; // ширина вікна перегляду
    const height = window.innerHeight; // висота вікна перегляду
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    this.particles.dots.forEach((dot) => svg.appendChild(dot.dotCircle));
  }

  startAnimation() {
    this.particles.run();
  }

  switchModes(amount: string) {
    // this.particles.animate();
    // const yOffset = height / 2 - 150; // висота по центру екрану
    // const paddingX = 100;

    console.log(this.particles.getDots());
    // const qrcode = this.flyingDotsService.drawMatrix(
    //   svg,
    //   QRCODE_JAR,
    //   10,
    //   1,
    //   1,
    //   50,
    //   50
    // );

    // const timer$ = timer(5000, 10000) //start, interval
    //   .pipe(
    //     map(() => {
    //       const value = this.animate$.getValue();
    //       if (value >= 6) return this.animate$.next(1);
    //       return this.animate$.next(value + 1);
    //     }),
    //     map((res) => {
    //       const value = this.animate$.getValue();
    //       this.changeMethod(value, qrcode, width, height);
    //     })
    //   )
    //   .subscribe();
  }

  // changeMethod(res: number, matrix: DOT[], posX: number, posY: number) {
  //   switch (res) {
  //     case 1:
  //       this.flyingDotsService.moveDotsRandomly(matrix, 10000);
  //       break;
  //     case 2:
  //       this.flyingDotsService.moveDotsHome(matrix, 10000);
  //       break;
  //     case 3:
  //       this.flyingDotsService.updateMatrix(
  //         matrix,
  //         NUMBERS_MAP[2],
  //         posX / 2,
  //         posY / 2,
  //         4,
  //         4
  //       );
  //       break;
  //     case 5:
  //       this.flyingDotsService.moveDotsRandomly(matrix, 10000);
  //       break;
  //     case 6:
  //       this.flyingDotsService.moveDotsHome(matrix, 10000);
  //       break;
  //   }
  // }
}
