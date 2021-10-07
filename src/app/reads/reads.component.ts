import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
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
export class ReadsComponent implements AfterViewInit, OnInit {

  view: any[] = [700, 300];
  xAxisLabel = 'X';
  yAxisLabel = 'Y';
  timeline = true;
  dataToExport: unknown;
  averageValue;
  maxValue;
  minValue;

  colorScheme = {
    domain: ['#5AA454', '#E44D25', '#8931BD', '#7aa3e5', '#a8385d', '#aae3f5']
  };

  chartsSeries: any[];
  daysChartsSeries: any[];
  weekChartsSeries: any[];
  monthChartsSeries: any[];
  startDate: Date = this.getMinus7Days();
  endDate: Date = new Date();

  availableSensors$: Observable<MeshObject[]>;
  range: Subject<any> = new Subject<any>();
  selectedSensor: MeshObject;
  @ViewChild('sensorInput') sensorInput: NgModel;
  @ViewChild('startDateInput') startDateInput: NgModel;
  @ViewChild('endDateInput') endDateInput: NgModel;

  constructor(private firestore: AngularFirestore, private objectsStore: ObjectsStore ) {

  }

  ngOnInit(): void {
    // const preSelected = this.readsService.preSelectedSensor;
    // if (preSelected) {
    //   this.selectedSensor = preSelected;
    //   this.readsService.preSelectedSensor = undefined;
    // }
  }

  ngAfterViewInit(): void {
    const sensor$: Observable<MeshObject> = this.sensorInput.valueChanges;
    const dateRange$ = combineLatest([this.startDateInput.valueChanges, this.endDateInput.valueChanges])
      .pipe(map(([startDate, endDate]) => {
        return {startDate, endDate};
      }));


    combineLatest([sensor$, dateRange$]).pipe(switchMap(([sensor, range]) => {
        if (sensor && range) {
          return this.firestore.collection('objects/' + sensor.id + '/reads', ref => ref.where('time', '>', range.startDate)
            .where('time', '<', range.endDate)).snapshotChanges().pipe(map(values => ({sensor, range, values})));
        }
        return null;
      }
    )).subscribe(value => {
      if (value) {
        const {sum, sensorDataSeries} = this.mapMainSensorDataSeries(value);
        this.setDataToExport(value);
        this.computeStatistics(value, sum);
        this.setXYAxisLabels(value?.sensor);
        this.setMainChartConfig(value, sensorDataSeries);
        this.setGroupedChartsData(sensorDataSeries);
      } else {
        this.clearCharts();
      }
    });


    this.availableSensors$ = this.objectsStore.getAllObjects().pipe(map(objects => objects.filter(object => {
        return object?.objectType?.endsWith('Sensor');
      }
    )));
  }

  private mapMainSensorDataSeries<T>(value: {
    values: DocumentChangeAction<unknown>[],
    range: { endDate: any; startDate: any },
    sensor: MeshObject
  }): { sum, sensorDataSeries } {
    let sum = 0;
    const sensorDataSeries = value.values.map(e => {
      const data = e.payload.doc.data();
      // @ts-ignore
      sum += data.value;
      // @ts-ignore
      return {name: data.time.toDate(), value: data.value};
    });
    return {sum, sensorDataSeries};
  }

  private clearCharts(): void {
    this.chartsSeries = [];
    this.daysChartsSeries = [];
    this.weekChartsSeries = [];
    this.monthChartsSeries = [];
    this.averageValue = undefined;
  }

  private setGroupedChartsData(sensorDataSeries): void {
    // MONTH
    const groupsMonth = this.getGroupsMonth(sensorDataSeries);
    const {minGroupedSeriesMonths, maxGroupedSeriesMonths, avgGroupedSeriesMonths} = this.computeMonthGroupsStatistics(groupsMonth);

    // Week
    const groupsWeek = this.getGroupsWeek(sensorDataSeries);
    const {minGroupedSeriesWeeks, maxGroupedSeriesWeeks, avgGroupedSeriesWeeks} = this.computeWeekGroupsStatistics(groupsWeek);

    // DAYS
    const groupsDay = this.getGroupsDay(sensorDataSeries);
    const {minGroupedSeriesDays, maxGroupedSeriesDays, avgGroupedSeriesDays} = this.computeGroupsForDays(groupsDay);

    this.daysChartsSeries = [];
    this.daysChartsSeries.push({name: 'min per day', series: minGroupedSeriesDays});
    this.daysChartsSeries.push({name: 'max per day', series: maxGroupedSeriesDays});
    this.daysChartsSeries.push({name: 'avg per day', series: avgGroupedSeriesDays});

    this.weekChartsSeries = [];
    this.weekChartsSeries.push({name: 'min per week', series: minGroupedSeriesWeeks});
    this.weekChartsSeries.push({name: 'max per week', series: maxGroupedSeriesWeeks});
    this.weekChartsSeries.push({name: 'avg per week', series: avgGroupedSeriesWeeks});

    this.monthChartsSeries = [];
    this.monthChartsSeries.push({name: 'min per month', series: minGroupedSeriesMonths});
    this.monthChartsSeries.push({name: 'max per month', series: maxGroupedSeriesMonths});
    this.monthChartsSeries.push({name: 'avg per month', series: avgGroupedSeriesMonths});
  }

  private getGroupsMonth(sensorDataSeries): unknown {
    return sensorDataSeries.reduce((groupsTmp, values, {}) => {
      const month = values.name.getMonth();
      const year = values.name.getFullYear();
      const monthAndYear: string = String(month).concat('/', String(year));
      if (!groupsTmp[monthAndYear]) {
        groupsTmp[monthAndYear] = [];
      }
      groupsTmp[monthAndYear].push(values);
      return groupsTmp;
    }, {});
  }

  private computeMonthGroupsStatistics(groupsMonth): { minGroupedSeriesMonths, maxGroupedSeriesMonths, avgGroupedSeriesMonths } {
    let minGroupedSeriesMonths = [];
    let maxGroupedSeriesMonths = [];
    let avgGroupedSeriesMonths = [];
    Object.keys(groupsMonth).forEach((monthAndYear) => {
      const minValue = Math.min.apply(Math, groupsMonth[monthAndYear].map(v => v.value));
      const maxValue = Math.max.apply(Math, groupsMonth[monthAndYear].map(v => v.value));
      const avgValue = (groupsMonth[monthAndYear].map(v => v.value).reduce((a, b) => a + b, 0) / groupsMonth[monthAndYear].length)
        .toFixed(2);
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
    return {minGroupedSeriesMonths, maxGroupedSeriesMonths, avgGroupedSeriesMonths};
  }

  private getGroupsWeek(sensorDataSeries): unknown {
    return sensorDataSeries.reduce((groupsTmp, values, {}) => {
      const week = this.getWeek(values.name);
      const year = values.name.getFullYear();
      const weekAndYear: string = String(week).concat('/', String(year));
      if (!groupsTmp[weekAndYear]) {
        groupsTmp[weekAndYear] = [];
      }
      groupsTmp[weekAndYear].push(values);
      return groupsTmp;
    }, {});
  }

  private computeWeekGroupsStatistics(groupsWeek): { minGroupedSeriesWeeks, maxGroupedSeriesWeeks, avgGroupedSeriesWeeks } {
    let minGroupedSeriesWeeks = [];
    let maxGroupedSeriesWeeks = [];
    let avgGroupedSeriesWeeks = [];
    Object.keys(groupsWeek).forEach((weekAndYear) => {
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
    return {minGroupedSeriesWeeks, maxGroupedSeriesWeeks, avgGroupedSeriesWeeks};
  }

  private getGroupsDay(sensorDataSeries): unknown {
    return sensorDataSeries.reduce((groupsTmp, values, {}) => {
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
  }

  private computeGroupsForDays(groupsDay): { minGroupedSeriesDays, maxGroupedSeriesDays, avgGroupedSeriesDays } {
    let minGroupedSeriesDays = [];
    let maxGroupedSeriesDays = [];
    let avgGroupedSeriesDays = [];
    Object.keys(groupsDay).forEach((date) => {
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
    return {minGroupedSeriesDays, maxGroupedSeriesDays, avgGroupedSeriesDays};
  }

  private setDataToExport(value: {
    values: DocumentChangeAction<unknown>[],
    range: ObservedValueOf<Observable<{ endDate: any; startDate: any }>>,
    sensor: MeshObject
  }): void {
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

  private computeStatistics(value: {
                              values: DocumentChangeAction<unknown>[],
                              range: ObservedValueOf<Observable<{ endDate: any; startDate: any }>>,
                              sensor: MeshObject
                            },
                            sum: number): void {
    const rawValues: number[] = value.values.map(e => {
      const data = e.payload.doc.data();
      // @ts-ignore
      return data.value;
    });

    this.maxValue = Math.max.apply(Math, rawValues);
    this.minValue = Math.min.apply(Math, rawValues);
    this.averageValue = (sum / value.values.length);

    if (Number.isNaN(this.averageValue) || !Number.isFinite(this.averageValue)) {
          this.averageValue = 'No data';
        } else {
          this.averageValue = this.averageValue.toFixed(2);
        }
    if (Number.isNaN(this.minValue) || !Number.isFinite(this.minValue)) {
          this.minValue = 'No data';
        } else {
          this.minValue = this.minValue.toFixed(2);
        }
    if (Number.isNaN(this.maxValue) || !Number.isFinite(this.maxValue)) {
          this.maxValue = 'No data';
        } else {
          this.maxValue = this.maxValue.toFixed(2);
        }
  }

  private setMainChartConfig(value: {
                               values: DocumentChangeAction<unknown>[],
                               range: ObservedValueOf<Observable<{ endDate: any; startDate: any }>>,
                               sensor: MeshObject
                             },
                             sensorDataSeries: { name: Date; value: any }[]): void {
    this.chartsSeries = [{name: value.sensor.name, series: sensorDataSeries}];
  }

  private setXYAxisLabels(sensor: MeshObject): void {
    const sensorData = SENSOR_TYPES[sensor.objectType];
    this.xAxisLabel = sensorData?.xLabel;
    this.yAxisLabel = sensorData?.yLabel;
  }

  getWeek(date: Date): number {
    const firstJan = new Date(date.getFullYear(), 0, 1);
    const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayOfYear = ((today.getTime() - firstJan.getTime() + 86400000) / 86400000);
    return Math.ceil(dayOfYear / 7);
  }

  getMinus7Days(): Date {
    const date = new Date();
    date.setDate(date.getDate() - 5);
    return date;
  }

  export(): void {
    const blob = new Blob([JSON.stringify(this.dataToExport)], {type: 'text/plain;charset=utf-8'});
    FileSaver.saveAs(blob, 'sensorData.json');
  }
}
