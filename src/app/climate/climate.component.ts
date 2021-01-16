import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import {combineLatest, Observable, of, Subject} from 'rxjs';
import {MeshObject} from '../objects/object';
import {map, switchMap, tap} from 'rxjs/operators';
import {ObjectsStore} from '../objects/objects-store.service';
import {NgModel} from '@angular/forms';

@Component({
  selector: 'app-climate',
  templateUrl: './climate.component.html',
  styleUrls: ['./climate.component.scss']
})

export class ClimateComponent implements AfterViewInit {

  view: any[] = [700, 300];
  xAxisLabel = 'Time';
  yAxisLabel = 'Temperature';
  timeline = true;

  colorScheme = {
    domain: ['#5AA454', '#E44D25', '#CFC0BB', '#7aa3e5', '#a8385d', '#aae3f5']
  };
  selectedDate: Date = new Date();
  chartSeries: any[];
  availableSensors$: Observable<MeshObject[]>;
  range: Subject<any> = new Subject<any>();


  @ViewChild('sensorInput') sensorInput: NgModel;
  @ViewChild('selectedDateInput') selectedDateInput: NgModel;

  constructor(private firestore: AngularFirestore, private objectsStore: ObjectsStore) {

  }

  getMinus7Days(): Date {
    const date = new Date();
    date.setDate(date.getDate() - 5);
    return date;
  }

  get1Day(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    return date;
  }

  ngAfterViewInit(): void {

    this.availableSensors$ = this.objectsStore.getAllObjects().pipe(map(objects => objects.filter(object => {
        return object?.objectType?.endsWith('Sensor');
      }
    )));

    const sensor$ = this.sensorInput.valueChanges;

    const selectedDate$ = this.selectedDateInput.valueChanges;

    combineLatest([sensor$, selectedDate$]).pipe(tap(([sensor, selectedDate]) => console.log('data', selectedDate)), switchMap(([sensor, selectedDate]) => {
      if (sensor && selectedDate) {
        return this.firestore.collection('objects/' + sensor.id + '/reads', ref => ref.where('time', '>', selectedDate)
          .where('time', '<', this.getDatePlusDays(selectedDate, 1))).snapshotChanges();
      }
      return of(null);
    })).subscribe(value => {
      if (value) {
        const map1 = value.map(e => {
          const data = e.payload.doc.data();
          // @ts-ignore
          return {name: data.time.toDate(), value: data.value};
        });
        this.chartSeries = [{name: 'czujnikTemp', series: map1}];
      } else {
        this.chartSeries = [];
      }
    });


  }

  private getDatePlusDays(selectedDate: Date, days: number): Date {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    return date;
  }

}
