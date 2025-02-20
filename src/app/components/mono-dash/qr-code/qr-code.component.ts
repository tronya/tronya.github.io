import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { QRCODE_JAR } from '../../ui/canva/helpers/qr-code';
import { colors } from '../helper';

@Component({
    selector: 'qr-code',
    templateUrl: './qr-code.component.html',
    imports: [CommonModule]
})
export class QRCodeComponent {
  qr_jar = QRCODE_JAR.map((row, i) =>
    row.map((col, y) => {
      const randomColor = Math.floor(Math.random() * colors.length);
      return {
        visible: col,
        active: false,
        id: `${i}${y}`,
        color: `transparent`,
      };
    })
  );

  changePointByCoords(x: number, y: number, color = 'green') {
    const randomColor = Math.floor(Math.random() * colors.length);

    this.qr_jar[x][y].color = `#${colors[randomColor]}`;
    this.qr_jar[x][y].active = false;
  }

  startLoop = () => {
    const length = () => Math.floor(Math.random() * this.qr_jar.length);

    const start = () => {
      const [a, b] = [length(), length()];
      this.changePointByCoords(a, b);
      requestAnimationFrame(start);
    };
    requestAnimationFrame(start);
  };

  constructor() {
    requestAnimationFrame(this.startLoop);
  }
}
