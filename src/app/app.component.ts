import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    host: { class: 'h-full w-full bg-white' },
    imports: [CommonModule, RouterModule],
    encapsulation: ViewEncapsulation.None
})
export class AppComponent {
  title = 'mono-banka';
}
