import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Options } from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';
import { mock, ReportsUtils } from './mock';
import Highcharts from 'highcharts';

@Component({
    templateUrl: 'chart.component.html',
    imports: [CommonModule, HighchartsChartModule]
})
export class ChartComponent implements OnInit {
  private chartOptions: Highcharts.Options = {}; // Define chart options here
  private chart!: Highcharts.Chart;

  public strategicDetectorName = '';
  private minTime: number = 0;
  private maxTime: number = 0;

  public readonly barChart5MinInterval = (1 / 60) * 5;
  @ViewChild('chartTargetBar', { static: true }) chartTargetBar!: ElementRef;
  @ViewChild('chartTargetLine', { static: true }) chartTargetLine!: ElementRef;

  constructor() {

  }
  ngOnInit(): void {
    this.prepare(mock);
  }
  prepare(strategicDetector: any) {
    console.log(strategicDetector);
    if (strategicDetector) {
      this.strategicDetectorName = strategicDetector[0].detectorName;
      const series: any = [];
      const seriesFlow: any = [];
      const seriesSpeed: any = [];
      const reportDateTime = new Date(strategicDetector[0].time);

      this.minTime = reportDateTime.getTime();
      const maxTime = new Date(reportDateTime);
      maxTime.setHours(23, 59, 59, 999);
      this.maxTime = maxTime.getTime();

      // const start = new Date(
      //   new Date(this.minTime).setHours(0, 0, 0, 0)
      // ).getTime();
      // if (
      //   new Date(strategicDetector[0].time).getTime() - start >
      //   ReportsUtils.barChart5MinInterval
      // ) {
      //   const amountOfEmptySeries =
      //     (new Date(strategicDetector[0].time).getTime() - start) / (60000 * 5);
      //   console.log(amountOfEmptySeries);
      //   console.log(ReportsUtils.barChart5MinInterval);
      //   for (let i = amountOfEmptySeries; i > 0; i--) {
      //     series.push({
      //       data: [ReportsUtils.barChart5MinInterval],
      //       color: 'rgba(0, 0, 0, .01)',
      //       borderWidth: 0,
      //       fuzzyFlow: '',
      //       fuzzySpeed: '',
      //       time: '',
      //     });
      //   }
      // }

      strategicDetector.forEach((sd: any) => {
        const time = ReportsUtils.barChart5MinInterval;
        const flow = sd.fuzzyFlow ? sd.fuzzyFlow : 0;
        const speed = sd.fuzzySpeed ? sd.fuzzySpeed : 0;
        const status = ReportsUtils.getTrafficState(flow, speed);
        const alpha = status ? 1 : 0;
        const color = `rgba(${ReportsUtils.getTrafficStateColor(
          status
        )}, ${alpha})`;
        series.push({
          data: [time],
          color,
          borderWidth: 0,
          fuzzyFlow: sd.fuzzyFlow,
          fuzzySpeed: sd.fuzzySpeed,
          detectionStationName: sd.detectorName,
          status,
        });
        const date: Date = new Date(sd.time);

        seriesFlow.push({
          y: sd.fuzzyFlow,
          x: date.getTime(),
        });

        seriesSpeed.push({
          y: sd.fuzzySpeed,
          x: date.getTime(),
        });
      });
      console.log({ series: series.reverse(), seriesFlow, seriesSpeed });
      this.createBarChart(series.reverse());
      this.createLineChart();

      this.chart?.addSeries({
        type: 'line',
        name: 'fuzzyFlow',
        data: seriesFlow,
      });
      this.chart?.addSeries({
        type: 'line',
        name: 'fuzzySpeed',
        data: seriesSpeed,
      });
    }
  }

  createBarChart(series = []) {
    this.chartOptions = {
      chart: {
        type: 'bar',
        height: '180px',
        marginLeft: 15,
      },
      title: { text: 'Bar Chart' },
      noData: {
        style: {
          fontWeight: 'bold',
          fontSize: '15px',
          color: '#303030',
        },
        position: {
          verticalAlign: 'top',
        },
      },
      loading: {
        labelStyle: {
          color: 'white',
        },
        style: {
          backgroundColor: 'gray',
        },
      },
      time: {
        useUTC: false,
      },
      plotOptions: {
        bar: {
          stacking: "normal",
          pointWidth: 50,  // Sets the width of each bar to 50px
          groupPadding: 0.1, // Adjust spacing between bars to control height indirectly
      },
        series: {
          marker: { enabled: true },
        },
      },
      legend: { enabled: false },
      credits: { enabled: false },
      xAxis: { categories: [''], title: { text: null } },
      yAxis: {
        min: 0,
        max: 24,
        tickInterval: 2,
        minorTickInterval: 0.5,
        title: {
          text: 'INES.Traffic_States',
          offset: 0,
          y: -140,
        },
        labels: {
          formatter(value) {
            if (+value.value === 24) {
              return '00:00';
            } else if (+value.value < 10) {
              return `0${+value.value}:00`;
            }
            return value.value + ':00';
          },
        },
      },
      series,
      tooltip: {
        formatter() {
          let tooltip =
            '<b>' +
            `Status` +
            ':</b> ' +
            (this.series.userOptions as any).status +
            '<br>';
          tooltip = tooltip.concat(
            '<b>' +
              `Fuzzy_Volume` +
              '</b>: ' +
              (this.series.userOptions as any).fuzzyFlow +
              '<br>'
          );
          tooltip = tooltip.concat(
            '<b>' +
              `Fuzzy_Speed` +
              '</b>: ' +
              (this.series.userOptions as any).fuzzySpeed || 'hello'
          );
          return tooltip;
        },
      },
    };
    this.chart = Highcharts.chart(
      this.chartTargetBar.nativeElement,
      this.chartOptions
    );
  }

  private createLineChart() {
    const that = this;
    const options: Options = {
      chart: {
        height: '180px',
        marginLeft: 15,
        spacingLeft: 0,
      },
      title: { text: 'Line Chart' },
      noData: {
        style: {
          fontWeight: 'bold',
          fontSize: '15px',
          color: '#303030',
        },
        position: {
          verticalAlign: 'top',
        },
      },
      loading: {
        labelStyle: {
          color: 'white',
        },
        style: {
          backgroundColor: 'gray',
        },
      },
      time: {
        useUTC: false,
      },
      plotOptions: {
        series: {
          marker: { enabled: false },
        },
      },
      legend: { enabled: false },
      credits: { enabled: false },
      yAxis: {
        title: { text: null },
        categories: [''],
        min: 0,
        max: 4,
        offset: 0,
        labels: { x: -8 },
      },
      xAxis: {
        title: {
          text: 'INES.Normalized',
          offset: 0,
          y: -140,
        },
        min: that.minTime,
        max: that.maxTime,
        type: 'datetime',
        tickInterval: ReportsUtils.tickHoursInterval * 3600000, // 3600000 - 1ms/hrs
        endOnTick: true,
        startOnTick: true,
      },
      series: [],
      tooltip: {
        formatter() {
          return (
            '<b>' + this.series['userOptions'].name + ':</b> ' + this.point.y
          );
        },
      },
    };
    this.chart = Highcharts.chart(
      this.chartTargetLine.nativeElement,
      options
    );
  }
}
