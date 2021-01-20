import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import {combineLatest, Observable, of, Subject} from 'rxjs';
import {MeshObject} from '../objects/object';
import {map, switchMap, tap} from 'rxjs/operators';
import {ObjectsStore} from '../objects/objects-store.service';
import {NgModel} from '@angular/forms';
import {angularMath} from 'angular-ts-math';

@Component({
  selector: 'app-climate',
  templateUrl: './climate.component.html',
  styleUrls: ['./climate.component.scss']
})

export class ClimateComponent implements AfterViewInit {
  view: any[] = [500, 200];
  xAxisLabel = 'Time';
  yAxisLabel = 'Temperature';
  timeline = true;
  averageValueTemp = 0;
  averageValueHum = 0;
  PMV = 0;
  PPD = 0;
  M = 1.0; // metabolizm
  W = 0; // praca zewnetrzna
  Icl = 1; // opor cieplny odziezy
  tr = 0; // srednia temperatura promieniowania
  vAr = 0.1; // wzgledna predkosc przeplywu powietrza

  colorScheme = {
    domain: ['#5AA454', '#E44D25', '#CFC0BB', '#7aa3e5', '#a8385d', '#aae3f5']
  };
  selectedDate: Date = new Date();
  chartsSeriesTemp: any[];
  chartsSeriesHum: any[];
  availableSensors$: Observable<MeshObject[]>;
  range: Subject<any> = new Subject<any>();
  meta: number;

  tempHumiditySensors$: Observable<MeshObject[]>;
  @ViewChild('sensorInput') sensorInput: NgModel;
  @ViewChild('selectedDateInput') selectedDateInput: NgModel;
  Mytime: any;


  constructor(private firestore: AngularFirestore, private objectsStore: ObjectsStore) {

  }


  ngAfterViewInit(): void {


    this.availableSensors$ = this.objectsStore.getAllObjects().pipe(map(objects => objects.filter(object => {
        return object?.objectType?.endsWith('Sensor');
      }
    )));

    this.tempHumiditySensors$ = this.availableSensors$.pipe(map(sensors => sensors.filter(value => {
        return value?.objectType?.endsWith('tempSensor') || value?.objectType?.endsWith('humiditySensor');
      }
    )));

    const sensor$ = this.sensorInput.valueChanges;
    const selectedDate$ = this.selectedDateInput.valueChanges;


    combineLatest([sensor$, selectedDate$]).pipe(tap(([sensor, selectedDate]) => console.log('data', selectedDate, 'sensor', sensor)),
      switchMap(([sensor, selectedDate]) => {
        if (sensor && selectedDate) {
          return this.firestore.collection('objects/' + sensor.id + '/reads', ref => ref.where('time', '>', selectedDate)
            .where('time', '<', this.getDatePlusDays(selectedDate, 1))).snapshotChanges();
        }
        return of(null);
      })).subscribe(value => {
      if (value) {
        let sum = 0;
        let classifiedRecordsLength = 0;
        const sensorDataSeries = value.map(e => {
          const data = e.payload.doc.data();
          const date = data.time.toDate();

          // średnia z 17:45 - 18:00
          if (date.getHours() === 17 && date.getMinutes() >= 45) {
            sum += data.value;
            console.log('godz', date.getHours(), 'minutes', date.getMinutes(), 'suma ', sum);
            classifiedRecordsLength += 1;
            return {name: date, value: data.value};
          }

          return null;
        }).filter(x => !!x);
        console.log('cos ssss', this.sensorInput);
        if (this.sensorInput.viewModel.name === 'Temperature sensor') {
          this.averageValueTemp = sum / classifiedRecordsLength;
          this.chartsSeriesTemp = [{name: 'Temperature sensor', series: sensorDataSeries}];
        }

        if (this.sensorInput.viewModel.name === 'Humidity sensor') {
          this.averageValueHum = sum / classifiedRecordsLength;
          this.chartsSeriesHum = [{name: 'Humidity sensor', series: sensorDataSeries}];
        }

      } else {
        this.chartsSeriesTemp = [];
        this.chartsSeriesHum = [];
      }


      this.tr = this.averageValueTemp;

      const pa = this.averageValueTemp * this.averageValueHum * 0.001;
      console.log('pa: ', pa);

      let fcl = 0;
      let hc = 0;

      if (this.Icl <= 0.5) {
        fcl = 1.00 + 0.2 * this.Icl;
      } else {
        fcl = 1.05 + 0.1 * this.Icl;
      }
      console.log('fcl: ', fcl);

      const C1 = (3.05 * (5.73 - 0.007 * (this.M * (58.2) - this.W) - pa));
      const C2 = (0.42 * ((this.M * (58.2) - this.W) - 58.15) + (0.0173 * this.M * (58.2) * (5.87 - pa) + (0.0014 * this.M * (58.2) * (34 - this.averageValueTemp))));
      const tcl = 35.7 - 0.0275 * (this.M * (58.2) - this.W) - 0.155 * this.Icl * ((this.M * (58.2) - this.W) - C1 - C2);
      console.log('tcl: ', tcl);


      if ((2.38 * (angularMath.powerOfNumber((tcl - this.averageValueTemp), 0.25))) < (12.1 * angularMath.squareOfNumber(this.vAr))) {
        hc = 12.1 * angularMath.squareOfNumber(this.vAr);
      } else {
        hc = 2.38 * (angularMath.powerOfNumber((tcl - this.averageValueTemp), 0.25));
      }

      const L = this.M * (58.2) - this.W - (3.96 * angularMath.powerOfNumber(10, -8) * fcl * (angularMath.powerOfNumber((tcl + 273), 4) - angularMath.powerOfNumber((this.tr + 273), 4)) + (fcl * hc * (tcl - this.averageValueTemp) + C1 + C2));
      console.log('L: ', L);
      this.PMV = (0.303 * angularMath.powerOfNumber(angularMath.getE(), (-0.036 * this.M * (58.2))) + 0.028) * L;
      console.log('PMV: ', this.PMV);

      this.PPD = 100 - 95 * angularMath.powerOfNumber(angularMath.getE(), (-(0.03353 * angularMath.powerOfNumber(this.PMV, 4)) + 0.2179 * angularMath.powerOfNumber(this.PMV, 2)));
      console.log('PPD: ', this.PPD);

    });

  }

  private getDatePlusDays(selectedDate: Date, days: number): Date {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    return date;
  }

}
