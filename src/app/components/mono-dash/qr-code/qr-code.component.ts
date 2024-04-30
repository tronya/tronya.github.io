import { Component } from '@angular/core';
import { QRCODE_JAR } from '../../ui/canva/helpers/qr-code';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'qr-code',
  templateUrl: './qr-code.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class QRCodeComponent {
  qr_jar = QRCODE_JAR;
}
