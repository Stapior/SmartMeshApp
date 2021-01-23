import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {AngularFirestore, DocumentChangeAction} from '@angular/fire/firestore';
import {combineLatest, Observable, ObservedValueOf, Subject} from 'rxjs';
import {MeshObject} from '../objects/object';
import {map, switchMap} from 'rxjs/operators';
import {ObjectsStore} from '../objects/objects-store.service';
import {NgModel} from '@angular/forms';
import {SENSOR_TYPES} from './sensor-types';
import * as FileSaver from 'file-saver';

@Component({
  selector: 'app-reads',
  templateUrl: './reads.component.html',
  styleUrls: ['./reads.component.scss']
})
export class ReadsComponent implements AfterViewInit {

  view: any[] = [700, 300];
  xAxisLabel = 'X';
  yAxisLabel = 'Y';
  timeline = true;
  dataToExport: unknown;
  averageValue;
  maxValue;
  minValue;

  colorScheme = {
    domain: ['#5AA454', '#E44D25', '#CFC0BB', '#7aa3e5', '#a8385d', '#aae3f5']
  };

  chartsSeries: any[];
  secondChartsSeries: any[];
  startDate: Date = this.getMinus7Days();
  endDate: Date = new Date();

  availableSensors$: Observable<MeshObject[]>;
  range: Subject<any> = new Subject<any>();


  @ViewChild('sensorInput') sensorInput: NgModel;
  @ViewChild('startDateInput') startDateInput: NgModel;
  @ViewChild('endDateInput') endDateInput: NgModel;

  constructor(private firestore: AngularFirestore, private objectsStore: ObjectsStore) {

  }

  getMinus7Days(): Date {
    const date = new Date();
    date.setDate(date.getDate() - 5);
    return date;
  }

  ngAfterViewInit(): void {
    const sensor$: Observable<MeshObject> = this.sensorInput.valueChanges;
    const dateRange$ = combineLatest([this.startDateInput.valueChanges, this.endDateInput.valueChanges])
      .pipe(map(([startDate, endDate]) => {
        return {startDate, endDate};
      }));


    combineLatest([sensor$, dateRange$]).pipe(switchMap(([sensor, range]) => {
      return this.firestore.collection('objects/' + sensor.id + '/reads', ref => ref.where('time', '>', range.startDate)
        .where('time', '<', range.endDate)).snapshotChanges().pipe(map(values => ({sensor, range, values})));
    })).subscribe(value => {

      let sum = 0;
      const sensorDataSeries = value.values.map(e => {
        const data = e.payload.doc.data();
        // @ts-ignore
        sum += data.value;
        // @ts-ignore
        return {name: data.time.toDate(), value: data.value};
      });

      this.setDataToExport(value);
      this.computeStatistics(value, sum);
      this.setMainChartConfig(value, sensorDataSeries);

      // MONTH
      // this gives an object with dates as keys
        const groupsMonth = sensorDataSeries.reduce((groupsTmp, values, {}) => {
        const month = values.name.getMonth();
        const year = values.name.getFullYear();
        const monthAndYear: string = String(month).concat('/', String(year));
        if (!groupsTmp[monthAndYear]) {
          groupsTmp[monthAndYear] = [];
        }
        groupsTmp[monthAndYear].push(values);
        return groupsTmp;
      }, {});

      // Edit: to add it in the array format instead
      let minGroupedSeriesMonths = [];
      let maxGroupedSeriesMonths = [];
      let avgGroupedSeriesMonths = [];
      const valuesPerMonth = Object.keys(groupsMonth).map((monthAndYear) => {
        const minValue = Math.min.apply(Math, groupsMonth[monthAndYear].map(v => v.value));
        const maxValue = Math.max.apply(Math, groupsMonth[monthAndYear].map(v => v.value));
        const avgValue = (groupsMonth[monthAndYear].map(v => v.value).reduce((a, b) => a + b, 0) / groupsMonth[monthAndYear].length).toFixed(2);
        minGroupedSeriesMonths = minGroupedSeriesMonths.concat(groupsMonth[monthAndYear].map(v => {
          return {...v, value: minValue};
        }));

        maxGroupedSeriesMonths = maxGroupedSeriesMonths.concat(groupsMonth[monthAndYear].map(v => {
          return {...v, value: maxValue};
        }));

        avgGroupedSeriesMonths = avgGroupedSeriesMonths.concat(groupsMonth[monthAndYear].map(v => {
          return {...v, value: avgValue};
        }));
      });
      this.chartsSeries.push({name: 'minPerMonth', series: minGroupedSeriesMonths});
      this.chartsSeries.push({name: 'maxPerMonth', series: maxGroupedSeriesMonths});
      this.chartsSeries.push({name: 'avgPerMonth', series: avgGroupedSeriesMonths});
      console.log(valuesPerMonth);

      // Week
      // this gives an object with dates as keys
        const groupsWeek = sensorDataSeries.reduce((groupsTmp, values, {}) => {
        const week = this.getWeek(values.name);
        const year = values.name.getFullYear();
        const weekAndYear: string = String(week).concat('/', String(year));
        if (!groupsTmp[weekAndYear]) {
          groupsTmp[weekAndYear] = [];
        }
        groupsTmp[weekAndYear].push(values);
        return groupsTmp;
      }, {});

      // Edit: to add it in the array format instead
      let minGroupedSeriesWeeks = [];
      let maxGroupedSeriesWeeks = [];
      let avgGroupedSeriesWeeks = [];
      const valuesPerWeek = Object.keys(groupsWeek).map((weekAndYear) => {
        const minValue = Math.min.apply(Math, groupsWeek[weekAndYear].map(v => v.value));
        const maxValue = Math.max.apply(Math, groupsWeek[weekAndYear].map(v => v.value));
        const avgValue = (groupsWeek[weekAndYear].map(v => v.value).reduce((a, b) => a + b, 0) / groupsWeek[weekAndYear].length).toFixed(2);
        minGroupedSeriesWeeks = minGroupedSeriesWeeks.concat(groupsWeek[weekAndYear].map(v => {
          return {...v, value: minValue};
        }));

        maxGroupedSeriesWeeks = maxGroupedSeriesWeeks.concat(groupsWeek[weekAndYear].map(v => {
          return {...v, value: maxValue};
        }));

        avgGroupedSeriesWeeks = avgGroupedSeriesWeeks.concat(groupsWeek[weekAndYear].map(v => {
          return {...v, value: avgValue};
        }));
      });
      this.chartsSeries.push({name: 'minPerWeek', series: minGroupedSeriesWeeks});
      this.chartsSeries.push({name: 'maxPerWeek', series: maxGroupedSeriesWeeks});
      this.chartsSeries.push({name: 'avgPerWeek', series: avgGroupedSeriesWeeks});
      console.log(valuesPerWeek);

      // DAYS
      // this gives an object with dates as keys
        const groupsDay = sensorDataSeries.reduce((groupsTmp, values, {}) => {
        const day = values.name.getDate();
        const month = values.name.getMonth();
        const year = values.name.getFullYear();
        const date: string = String(day).concat('/', String(month), '/', String(year));
        if (!groupsTmp[date]) {
          groupsTmp[date] = [];
        }
        groupsTmp[date].push(values);
        return groupsTmp;
      }, {});

      // Edit: to add it in the array format instead
      let minGroupedSeriesDays = [];
      let maxGroupedSeriesDays = [];
      let avgGroupedSeriesDays = [];
      const valuesPerDay = Object.keys(groupsDay).map((date) => {
        const minValue = Math.min.apply(Math, groupsDay[date].map(v => v.value));
        const maxValue = Math.max.apply(Math, groupsDay[date].map(v => v.value));
        const avgValue = (groupsDay[date].map(v => v.value).reduce((a, b) => a + b, 0) / groupsDay[date].length).toFixed(2);
        minGroupedSeriesDays = minGroupedSeriesDays.concat(groupsDay[date].map(v => {
          return {...v, value: minValue};
        }));

        maxGroupedSeriesDays = maxGroupedSeriesDays.concat(groupsDay[date].map(v => {
          return {...v, value: maxValue};
        }));

        avgGroupedSeriesDays = avgGroupedSeriesDays.concat(groupsDay[date].map(v => {
          return {...v, value: avgValue};
        }));
      });
      const secondSensorDataSeries = value.values.map(e => {
        const data = e.payload.doc.data();
        // @ts-ignore
        return {name: data.time.toDate(), value: data.value};
      });

      this.setSecondChartConfig(value, secondSensorDataSeries);
      console.log(valuesPerDay);

      this.secondChartsSeries.pop();
      this.secondChartsSeries.push({name: 'minPerDay', series: minGroupedSeriesDays});
      this.secondChartsSeries.push({name: 'maxPerDay', series: maxGroupedSeriesDays});
      this.secondChartsSeries.push({name: 'avgPerDay', series: avgGroupedSeriesDays});
    });


    this.availableSensors$ = this.objectsStore.getAllObjects().pipe(map(objects => objects.filter(object => {
        return object?.objectType?.endsWith('Sensor');
      }
    )));
  }

  private setDataToExport(value: ObservedValueOf<Observable<{ values: DocumentChangeAction<unknown>[]; range: ObservedValueOf<Observable<{ endDate: any; startDate: any }>>; sensor: MeshObject }>>) {
    const dataValues = value.values.map(e => {
      const data = e.payload.doc.data();
      // @ts-ignore
      return {time: data.time.toDate(), value: data.value};
    });

    this.dataToExport = {
      sensorName: value.sensor.name,
      data: dataValues
    };
  }

  private computeStatistics(value: ObservedValueOf<Observable<{ values: DocumentChangeAction<unknown>[]; range: ObservedValueOf<Observable<{ endDate: any; startDate: any }>>; sensor: MeshObject }>>, sum: number) {
    const rawValues: number[] = value.values.map(e => {
      const data = e.payload.doc.data();
      // @ts-ignore
      return data.value;
    });

    this.maxValue = Math.max.apply(Math, rawValues);
    this.minValue = Math.min.apply(Math, rawValues);
    this.averageValue = sum / value.values.length;
  }

  private setMainChartConfig(value: ObservedValueOf<Observable<{ values: DocumentChangeAction<unknown>[]; range: ObservedValueOf<Observable<{ endDate: any; startDate: any }>>; sensor: MeshObject }>>, sensorDataSeries: { name: Date; value: any }[]): void {
    this.chartsSeries = [{name: value.sensor.name, series: sensorDataSeries}];
    const sensorData = SENSOR_TYPES[value.sensor.objectType];
    this.xAxisLabel = sensorData?.xLabel;
    this.yAxisLabel = sensorData?.yLabel;
  }

  private setSecondChartConfig(value: ObservedValueOf<Observable<{ values: DocumentChangeAction<unknown>[]; range: ObservedValueOf<Observable<{ endDate: any; startDate: any }>>; sensor: MeshObject }>>, sensorDataSeries: { name: Date; value: any }[]): void {
    this.secondChartsSeries = [{name: value.sensor.name, series: sensorDataSeries}];
    const sensorData = SENSOR_TYPES[value.sensor.objectType];
    this.xAxisLabel = sensorData?.xLabel;
    this.yAxisLabel = sensorData?.yLabel;
  }

  getWeek(date: Date): number {
    const onejan = new Date(date.getFullYear(), 0, 1);
    const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayOfYear = ((today.getTime() - onejan.getTime() + 86400000) / 86400000);
    return Math.ceil(dayOfYear / 7);
  }

  export(): void {
    const blob = new Blob([JSON.stringify(this.dataToExport)], {type: 'text/plain;charset=utf-8'});
    FileSaver.saveAs(blob, 'sensorData.json');
  }
}
