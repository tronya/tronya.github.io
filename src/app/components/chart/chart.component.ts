// chart.component.ts
import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';
import Heatmap from 'highcharts/modules/heatmap';
import Stock from 'highcharts/modules/stock';
import { signalComponents } from './signal-components.mock';

declare module 'highcharts' {
  interface Point {
    type?: string;
    width?: number;
  }
}

Heatmap(Highcharts);
Stock(Highcharts);

@Component({
  selector: 'app-chart',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, HighchartsChartModule],

  templateUrl: 'chart.component.html',
})
export class ChartComponent implements OnInit {
  Highcharts: typeof Highcharts = Highcharts;

  #yCategories = signalComponents.map((component) => component.name);

  private items: any[] = [];

  chartOptions: Highcharts.Options = {
    chart: {
      type: 'heatmap',
      height: 600,
    },

    xAxis: {
      min: 0,
      max: 301,
    },
    yAxis: {
      categories: this.#yCategories,
      reversed: true,
    },
    colorAxis: {
      dataClasses: [
        { from: 0, to: 1, color: '#ffffff' },
        { from: 1, to: 2, color: '#eee33e' },
        { from: 2, to: 3, color: '#00b050' },
      ],
    },
    series: [
      {
        type: 'heatmap',
        name: 'Signal',
        borderWidth: 1,
        data: this.generateItems(), // No need for casting
        dataLabels: {
          enabled: true,
          useHTML: true,
          formatter: function () {
            const value = this.point.value;
            const type = this.point.type;
            const width = this.point.width || 1; // If merged, width will be more than 1

            // Adjust the label position and size based on the merged width
            const labelStyle = `width: ${width * 20}px; text-align: center; color: ${this.point.color}; font-size: 12px; font-weight: bold;`;

            // Depending on the type, show different SVG or text
            switch (type) {
              case 'nodeState':
                return `<div style="${labelStyle}"><svg width="${width * 20}" height="20"><circle cx="${(width * 20) / 2}" cy="10" r="5" fill="${this.point.color}" /></svg></div>`;
              case 'signalGroup':
                return `<div style="${labelStyle}"><svg width="${width * 20}" height="20"><polygon points="${(width * 20) / 2},0 ${(width * 20)},20 0,20" fill="${this.point.color}" /></svg></div>`;
              case 'detector':
                return `<div style="${labelStyle}"><svg width="${width * 20}" height="20"><rect x="5" y="5" width="10" height="10" fill="${this.point.color}" /></svg></div>`;
              default:
                return `<div style="${labelStyle}">${value}</div>`;
            }
          },
        },
      },
    ]
    ,
    navigator: { enabled: true },
    scrollbar: { liveRedraw: false },
    rangeSelector: { enabled: false },
  };

  public ngOnInit() {
    this.generateItems();
  }

  generateItems() {
    const data = [];
    for (let y = 0; y < this.#yCategories.length; y++) {
      const component = signalComponents[y]; // Get the component info
      for (let x = 0; x < 1; x++) {
        const randomState = Math.floor(Math.random() * 3); // Random state: 0, 1, 2
        data.push({
          x,
          y,
          value: randomState,
          type: component.type, // Add the type from your signalComponents
        });
      }
    }
    this.items = [...data];
    return data as any; // Cast to `any` here
  }

}
