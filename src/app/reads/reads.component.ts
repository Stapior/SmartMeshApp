import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import {combineLatest, Observable, Subject} from 'rxjs';
import {MeshObject} from '../objects/object';
import {map, switchMap} from 'rxjs/operators';
import {ObjectsStore} from '../objects/objects-store.service';
import {NgModel} from '@angular/forms';
import {SENSOR_TYPES} from './sensor-types';


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
  averageValue;
  maxValue;
  minValue;

  colorScheme = {
    domain: ['#5AA454', '#E44D25', '#CFC0BB', '#7aa3e5', '#a8385d', '#aae3f5']
  };

  chartsSeries: any[];
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

  Date.prototype.getWeek = function() {
    var onejan = new Date(this.getFullYear(),0,1);
    var today = new Date(this.getFullYear(),this.getMonth(),this.getDate());
    var dayOfYear = ((today - onejan + 86400000)/86400000);
    return Math.ceil(dayOfYear/7)
  };

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

      const rawValues: number[] = value.values.map(e => {
        const data = e.payload.doc.data();
        // @ts-ignore
        return data.value;
      });

      this.maxValue = Math.max.apply(Math, rawValues);
      this.minValue = Math.min.apply(Math, rawValues);
      this.averageValue = sum / value.values.length;
      this.chartsSeries = [{name: value.sensor.name, series: sensorDataSeries}];
      const sensorData = SENSOR_TYPES[value.sensor.objectType];
      this.xAxisLabel = sensorData?.xLabel;
      this.yAxisLabel = sensorData?.yLabel;

      //MONTH
      // this gives an object with dates as keys
      const groupsMonth = sensorDataSeries.reduce((groupsTmp, values, {}) => {
        const month = values.name.getMonth();
        const year = values.name.getFullYear();
        const monthAndYear = String(month).concat("/",String(year));
        if (!groupsTmp[monthAndYear]) {
          groupsTmp[monthAndYear] = [];
        }
        groupsTmp[monthAndYear].push(values.value);
        return groupsTmp;
      }, {});

      // Edit: to add it in the array format instead
      const valuesPerMonth = Object.keys(groupsMonth).map((monthAndYear) => {
        return {
          monthAndYear,
          values: groupsMonth[monthAndYear],
          minValue: Math.min.apply(Math, groupsMonth[monthAndYear]),
          maxValue: Math.max.apply(Math, groupsMonth[monthAndYear]),
          avgValue: (groupsMonth[monthAndYear].reduce((a, b) => a + b, 0) / groupsMonth[monthAndYear].length).toFixed(2)
        };
      });
      console.log(valuesPerMonth);

      //WEEK
      // this gives an object with dates as keys
      const groupsWeek = sensorDataSeries.reduce((groupsTmp, values, {}) => {
        const week = values.name.getWeek();
        const year = values.name.getFullYear();
        const weekAndYear = String(week).concat("/",String(year));
        if (!groupsTmp[weekAndYear]) {
          groupsTmp[weekAndYear] = [];
        }
        groupsTmp[weekAndYear].push(values.value);
        return groupsTmp;
      }, {});

      // Edit: to add it in the array format instead
      const valuesPerWeek = Object.keys(groupsWeek).map((weekAndYear) => {
        return {
          weekAndYear,
          values: groupsWeek[weekAndYear],
          minValue: Math.min.apply(Math, groupsWeek[weekAndYear]),
          maxValue: Math.max.apply(Math, groupsWeek[weekAndYear]),
          avgValue: (groupsWeek[weekAndYear].reduce((a, b) => a + b, 0) / groupsWeek[weekAndYear].length).toFixed(2)
        };
      });
      console.log(valuesPerWeek);

      //DAYS
      // this gives an object with dates as keys
      const groupsDay = sensorDataSeries.reduce((groupsTmp, values, {}) => {
        const day = values.name.getDate();
        const month = values.name.getMonth();
        const year = values.name.getFullYear();
        const date = String(day).concat("/",String(month),"/",String(year));
        if (!groupsTmp[date]) {
          groupsTmp[date] = [];
        }
        groupsTmp[date].push(values.value);
        return groupsTmp;
      }, {});

      // Edit: to add it in the array format instead
      const valuesPerDay = Object.keys(groupsDay).map((date) => {
        return {
          date,
          values: groupsDay[date],
          minValue: Math.min.apply(Math, groupsDay[date]),
          maxValue: Math.max.apply(Math, groupsDay[date]),
          avgValue: (groupsDay[date].reduce((a, b) => a + b, 0) / groupsDay[date].length).toFixed(2)
        };
      });
      console.log(valuesPerDay);

    });

    this.availableSensors$ = this.objectsStore.getAllObjects().pipe(map(objects => objects.filter(object => {
        return object?.objectType?.endsWith('Sensor');
      }
    )));
  }

}
