import dayjs from 'dayjs';

export const chartOptionsConfig: Highcharts.Options = {
  chart: {
    type: 'columnrange',
    inverted: true,
  },
  time: {
    useUTC: false,
  },
  legend: {
    enabled: true,
  },
  title: {
    text: 'Hello',
  },
  xAxis: {
    categories: [], // Keep it dynamic; will be updated via data
    title: {
      text: 'Strategies',
    },
  },
  yAxis: {
    type: 'datetime', // Specifies time-based axis
    title: {
      text: 'Time of Day',
    },
    labels: {
      align: 'center',
      autoRotation: [0, 45], // Adjust rotation for better label visibility
      autoRotationLimit: 90,
      padding: 10,
    },
    min: dayjs().startOf('day').valueOf(), // Start of current day
    max: dayjs().endOf('day').valueOf(), // End of current day
  },
  credits: {
    enabled: false,
  },
  exporting: {
    enabled: false,
    buttons: {
      contextButton: {
        menuItems: ['downloadPDF', 'downloadCSV'],
      },
    },
  },
  plotOptions: {
    columnrange: {
      grouping: true,
      borderRadius: 5,

      dataLabels: {
        enabled: true, // Show data labels
        format: '{point.custom.status}', // Display the status
        allowOverlap: false, // Avoid overlapping labels
        align: 'center',
      },
    },
    series: {
      stacking: 'normal', // Ensures bars don't overlap
    },
  },
  series: [
    {
      name: 'Jan Empty Strat Delete Test',
      type: 'columnrange',
      pointWidth: 50,
      data: [],
    },
    {
      name: 'Jan Empty Strat Delete Test 2',
      type: 'columnrange',
      pointWidth: 50,
      data: [],
    },
    {
      name: 'Jan Empty Strat Delete Test 3',
      type: 'columnrange',
      pointWidth: 50,
      data: [],
    },
    {
      name: 'Jan Empty Strat Delete Test 4',
      type: 'columnrange',
      pointWidth: 50,
      data: [],
    },
  ],
};
