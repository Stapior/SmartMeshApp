import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import {combineLatest, Observable, of, Subject} from 'rxjs';
import {MeshObject} from '../objects/object';
import {delay, map, switchMap, throttleTime} from 'rxjs/operators';
import {ObjectsStore} from '../objects/objects-store.service';
import {NgForm, NgModel} from '@angular/forms';
import {angularMath} from 'angular-ts-math';

@Component({
  selector: 'app-climate',
  templateUrl: './climate.component.html',
  styleUrls: ['./climate.component.scss']
})

export class ClimateComponent implements AfterViewInit {

  // this shows up as default time.
  getTime = '00:00';

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
  selectedHumSensor: MeshObject;
  selectedTempSensor: MeshObject;
  availableSensors$: Observable<MeshObject[]>;
  range: Subject<any> = new Subject<any>();


  tempSensors$: Observable<MeshObject[]>;
  humiditySensors$: Observable<MeshObject[]>;
  @ViewChild('tempSensorInput') tempSensorInput: NgModel;
  @ViewChild('humSensorInput') humSensorInput: NgModel;
  @ViewChild('selectedDateInput') selectedDateInput: NgModel;
  @ViewChild('climateForm') form: NgForm;
  @ViewChild('timeInput') timeInput: NgModel;

  constructor(private firestore: AngularFirestore, private objectsStore: ObjectsStore) {

  }


  ngAfterViewInit(): void {


    this.availableSensors$ = this.objectsStore.getAllObjects().pipe(map(objects => objects.filter(object => {
        return object?.objectType?.endsWith('Sensor');
      }
    )));

    this.tempSensors$ = this.availableSensors$.pipe(map(sensors => sensors.filter(value =>
      value?.objectType?.endsWith('tempSensor'))));

    this.humiditySensors$ = this.availableSensors$.pipe(map(sensors => sensors
      .filter(value => value?.objectType?.endsWith('humiditySensor')
      )));

    this.humiditySensors$.subscribe(sensors => {
      if (sensors.length && !this.selectedHumSensor) {
        this.selectedHumSensor = sensors[0];
      }
    });

    this.tempSensors$.subscribe(sensors => {
      if (sensors.length && !this.selectedTempSensor) {
        this.selectedTempSensor = sensors[0];
      }
    });

    const tempSensor$ = this.tempSensorInput.valueChanges;
    const humSensor$ = this.humSensorInput.valueChanges;
    const time$ = this.timeInput.valueChanges;
    const selectedDate$: Observable<Date> = this.selectedDateInput.valueChanges;

    const tempValues$ = combineLatest([tempSensor$, selectedDate$]).pipe(
      switchMap(([tempSensor, selectedDate]) => {
        if (tempSensor && selectedDate) {
          return this.firestore.collection('objects/' + tempSensor.id + '/reads', ref => ref.where('time', '>', selectedDate)
            .where('time', '<', this.getDatePlusDays(selectedDate, 1))).snapshotChanges();
        }
        return of(null);
      })
    );

    const humValues$ = combineLatest([humSensor$, selectedDate$]).pipe(
      switchMap(([tempSensor, selectedDate]) => {
        if (tempSensor && selectedDate) {
          return this.firestore.collection('objects/' + tempSensor.id + '/reads', ref => ref.where('time', '>', selectedDate)
            .where('time', '<', this.getDatePlusDays(selectedDate, 1))).snapshotChanges();
        }
        return of(null);
      })
    );

    combineLatest([humValues$, selectedDate$, time$]).subscribe(([values, day, time]) => {
      if (values && day && time) {
        const sensorDataSeries = this.getSensorDataSeries(day, values);
        const sum = sensorDataSeries.map(value => value.value).reduce((a, b) => a + b, 0);
        this.averageValueHum = sum / sensorDataSeries.length;
        this.chartsSeriesHum = [{name: 'Humidity sensor', series: sensorDataSeries}];
      } else {
        this.chartsSeriesHum = [];
      }
      this.computeClimateComfort();
    });

    combineLatest([tempValues$, selectedDate$, time$]).subscribe(([values, day, time]) => {
      if (values && day && time) {
        const sensorDataSeries = this.getSensorDataSeries(day, values);
        const sum = sensorDataSeries.map(value => value.value).reduce((a, b) => a + b, 0);
        this.averageValueTemp = sum / sensorDataSeries.length;
        this.chartsSeriesTemp = [{name: 'Temperature sensor', series: sensorDataSeries}];
      } else {
        this.chartsSeriesTemp = [];
      }
      this.computeClimateComfort();
    });

    this.form.valueChanges.pipe(throttleTime(100), delay(200)).subscribe(value => {
      this.computeClimateComfort();
    });

  }

  private getSensorDataSeries(day: Date, values): { name: Date, value: number }[] {
    const hours = parseInt(this.getTime.split(':')[0], 10);
    const minutes = parseInt(this.getTime.split(':')[1], 10);
    day.setHours(hours);
    day.setMinutes(minutes);
    const startDate = day;
    const endDate = new Date(day.getTime() + 15 * 60 * 1000);
    return values.map(e => {
      const data = e.payload.doc.data();
      const date = data.time.toDate();
      if (date >= startDate && date < endDate) {
        return {name: date, value: data.value};
      }
      return null;
    }).filter(x => !!x);
  }

  private computeClimateComfort(): void {
    this.tr = this.averageValueTemp;
    const pa = this.averageValueTemp * this.averageValueHum * 0.001;
    console.log('pa: ', pa);
    const fcl = this.getFcl();
    console.log('fcl: ', fcl);
    const C1 = this.computeC1(pa);
    const C2 = this.computeC2(pa);
    const tcl = this.computeTcl(C1, C2);
    console.log('tcl: ', tcl);
    const hc = this.getHc(tcl);
    const L = this.getL(fcl, tcl, hc, C1, C2);
    this.PMV = this.getPmv(L);
    this.PPD = this.getPpd();
    console.log('L: ', L);
    console.log('PMV: ', this.PMV);
    console.log('PPD: ', this.PPD);
  }

  private getHc(tcl: number): number {
    if ((2.38 * (angularMath.powerOfNumber((tcl - this.averageValueTemp), 0.25))) < (12.1 * angularMath.squareOfNumber(this.vAr))) {
      return 12.1 * angularMath.squareOfNumber(this.vAr);
    } else {
      return 2.38 * (angularMath.powerOfNumber((tcl - this.averageValueTemp), 0.25));
    }
  }

  private getFcl(): number {
    if (this.Icl <= 0.5) {
      return 1.00 + 0.2 * this.Icl;
    } else {
      return 1.05 + 0.1 * this.Icl;
    }
  }

  private computeTcl(C1: number, C2: number): number {
    return 35.7 - 0.0275 * (this.M * (58.2) - this.W) - 0.155 * this.Icl * ((this.M * (58.2) - this.W) - C1 - C2);
  }

  private computeC2(pa: number): number {
    return 0.42 * ((this.M * (58.2) - this.W) - 58.15) + (0.0173 * this.M * (58.2) * (5.87 - pa) +
      (0.0014 * this.M * (58.2) * (34 - this.averageValueTemp)));
  }

  private computeC1(pa: number): number {
    return 3.05 * (5.73 - 0.007 * (this.M * (58.2) - this.W) - pa);
  }

  private getL(fcl: number, tcl: number, hc: number, C1: number, C2: number): number {
    return this.M * (58.2) - this.W - (3.96 * angularMath.powerOfNumber(10, -8) * fcl *
      (angularMath.powerOfNumber((tcl + 273), 4) - angularMath.powerOfNumber((this.tr + 273), 4)) +
      (fcl * hc * (tcl - this.averageValueTemp) + C1 + C2));
  }

  private getPmv(L: number): number {
    return (0.303 * angularMath.powerOfNumber(angularMath.getE(), (-0.036 * this.M * (58.2))) + 0.028) * L;
  }

  private getPpd(): number {
    return 100 - 95 * angularMath.powerOfNumber(angularMath.getE(), (-(0.03353 * angularMath.powerOfNumber(this.PMV, 4)) + 0.2179 *
      angularMath.powerOfNumber(this.PMV, 2)));
  }

  private getDatePlusDays(selectedDate: Date, days: number): Date {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    return date;
  }


}
