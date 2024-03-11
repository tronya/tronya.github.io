import { Component, ViewEncapsulation } from '@angular/core';
import { DotsTextComponent } from './components/dots-text/dots-text.component';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  host: { class: 'h-full w-full bg-black' },
  standalone: true,
  imports: [CommonModule, RouterModule, DotsTextComponent],
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent {
  title = 'mono-banka';
}
