import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import Highcharts, { SeriesOptionsType } from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';
import { StrategiesService } from '../services/strategies.service';
import { StrategyHistoryStoreService } from '../services/strategyHistoryStoreService.service';

import HCMore from 'highcharts/highcharts-more';
import { chartOptionsConfig } from './config';
import { delay } from 'rxjs';

HCMore(Highcharts);

@Component({
  standalone: true,
  templateUrl: './strategy-graph-timeline.component.html',
  selector: 'strategy-timeline',
  imports: [CommonModule, HighchartsChartModule],
  providers: [StrategyHistoryStoreService, StrategiesService],
})
export class StrategyGraphTimelineComponent {
  public Highcharts: typeof Highcharts = Highcharts;
  public chart: Highcharts.Chart | undefined; // Store the Highcharts chart instance
  public chartOptions: Highcharts.Options = chartOptionsConfig;

  constructor(
    private strategyHistoryStoreService: StrategyHistoryStoreService
  ) {}

  public chartCallback: Highcharts.ChartCallbackFunction = (chart) => {
    this.chart = chart; // Store the chart instance
    console.log('Chart instance captured:', this.chart);
    this.updateChart();
  };

  updateChart() {
    this.strategyHistoryStoreService.strategyHistory
      .pipe(delay(2000))
      .subscribe((chartData) => {
        this.chart?.update({
          ...chartOptionsConfig,
          title: {
            text: 'Reloaded Chart Example patch',
          },
          xAxis: {
            categories: chartData.categories,
          },
          tooltip: {
            useHTML: true,
            headerFormat: '<div>{point.color}</div>',
            pointFormat: '<b>{new Date()} {point.custom.status}</b>',
            footerFormat: `<p>{{new Date().toDateString()}} | date: 'short'</p>`,
          },
          yAxis: {
            type: 'datetime',
            min: chartData.yAxisMin,
            max: chartData.yAxisMax,
            title: {
              text: 'Time of Day',
            },
          },
          series: chartData.strategies,
        });
      });
  }
}
