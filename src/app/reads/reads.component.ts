import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import {combineLatest, Observable, Subject} from 'rxjs';
import {MeshObject} from '../objects/object';
import {map, switchMap} from 'rxjs/operators';
import {ObjectsStore} from '../objects/objects-store.service';
import {NgModel} from '@angular/forms';


@Component({
  selector: 'app-reads',
  templateUrl: './reads.component.html',
  styleUrls: ['./reads.component.scss']
})
export class ReadsComponent implements AfterViewInit {

  view: any[] = [700, 300];
  xAxisLabel = 'Time';
  yAxisLabel = 'Temperature';
  timeline = true;

  colorScheme = {
    domain: ['#5AA454', '#E44D25', '#CFC0BB', '#7aa3e5', '#a8385d', '#aae3f5']
  };

  multi: any[];
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
    const sensor$ = this.sensorInput.valueChanges;
    const dateRange$ = combineLatest([this.startDateInput.valueChanges, this.endDateInput.valueChanges])
      .pipe(map(([startDate, endDate]) => {
      return {startDate, endDate};
    }));

    combineLatest([sensor$, dateRange$]).pipe(switchMap(([sensor, range]) => {
      return this.firestore.collection('objects/' + sensor.id + '/reads', ref => ref.where('time', '>', range.startDate)
        .where('time', '<', range.endDate)).snapshotChanges();
    })).subscribe(value => {
      const map1 = value.map(e => {
        const data = e.payload.doc.data();
        // @ts-ignore
        return {name: data.time.toDate(), value: data.value};
      });
      this.multi = [{name: 'czujnikTemp', series: map1}];
    });

    this.availableSensors$ = this.objectsStore.getAllObjects().pipe(map(objects => objects.filter(object => {
        return object?.objectType?.endsWith('Sensor');
      }
    )));
  }

}
