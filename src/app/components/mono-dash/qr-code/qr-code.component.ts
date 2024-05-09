import { Component } from '@angular/core';
import { QRCODE_JAR } from '../../ui/canva/helpers/qr-code';
import { CommonModule } from '@angular/common';

const colors = [
  '496989',
  '58A399',
  'A8CD9F',
  'E2F4C5',
  'CDE8E5',
  'EEF7FF',
  '7AB2B2',
  '4D869C',
];
@Component({
  selector: 'qr-code',
  templateUrl: './qr-code.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class QRCodeComponent {
  qr_jar = QRCODE_JAR.map((row, i) =>
    row.map((col, y) => {
      const randomColor = Math.floor(Math.random() * colors.length);
      return {
        visible: col,
        active: false,
        id: `${i}${y}`,
        color: ``,
      };
    })
  );

  changePointByCoords(x: number, y: number, color = 'green') {
    const randomColor = Math.floor(Math.random() * colors.length);
    console.log('---++>>', x, y, colors[randomColor]);
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
