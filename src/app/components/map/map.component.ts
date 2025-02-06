import { Component, ViewEncapsulation } from '@angular/core';
import { MapService } from './map.service';

@Component({
  standalone: true,
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  providers: [MapService],
  encapsulation: ViewEncapsulation.None,
})
export class MapComponent {
  constructor(private mapService: MapService) {}

  ngAfterViewInit(): void {
    this.mapService.initializeMap('map');
    this.mapService.trackUserLocation();
    this.mapService.navigationControl();
  }
}
