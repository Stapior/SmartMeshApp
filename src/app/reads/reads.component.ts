import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import {combineLatest, Observable, Subject} from 'rxjs';
import {MeshObject} from '../objects/object';
import {map, switchMap} from 'rxjs/operators';
import {ObjectsStore} from '../objects/objects-store.service';
import {NgModel} from '@angular/forms';
import {SENSOR_TYPES} from './SensorTypes';


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
        return  data.value;
      });

      this.maxValue = Math.max.apply(Math, rawValues);
      this.minValue =  Math.min.apply(Math, rawValues);
      this.averageValue = sum / value.values.length;
      this.chartsSeries = [{name: value.sensor.name, series: sensorDataSeries}];
      const sensorData = SENSOR_TYPES[value.sensor.objectType];
      this.xAxisLabel = sensorData?.xLabel;
      this.yAxisLabel = sensorData?.yLabel;

    });

    this.availableSensors$ = this.objectsStore.getAllObjects().pipe(map(objects => objects.filter(object => {
        return object?.objectType?.endsWith('Sensor');
      }
    )));
  }

}
