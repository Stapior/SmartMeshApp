import {Component, OnInit} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';

@Component({
  selector: 'app-reads',
  templateUrl: './reads.component.html',
  styleUrls: ['./reads.component.scss']
})
export class ReadsComponent implements OnInit {

  view: any[] = [700, 300];
  xAxisLabel = 'Time';
  yAxisLabel = 'Temperature';
  timeline = true;

  colorScheme = {
    domain: ['#5AA454', '#E44D25', '#CFC0BB', '#7aa3e5', '#a8385d', '#aae3f5']
  };

  multi: any[];
  startDate: Date = new Date();
  endDate: Date = new Date();


  constructor(private firestore: AngularFirestore) {

  }


  ngOnInit(): void {
    this.firestore.collection('objects/18/reads', ref => ref.where('time', '>', this.startDate).where('time', '<', this.endDate))
      .snapshotChanges().subscribe(value => {
      const map1 = value.map(e => {
        const data = e.payload.doc.data();
        // @ts-ignore
        return {name: data.time.toDate(), value: data.value};
      });
      console.log(map1);
      this.multi = [{name: 'czujnikTemp', series: map1}];
    });
  }


  loadData(): void {
    this.firestore.collection('objects/18/reads', ref => ref.where('time', '>', this.startDate).where('time', '<', this.endDate))
      .snapshotChanges().subscribe(value => {
      const map1 = value.map(e => {
        const data = e.payload.doc.data();
        // @ts-ignore
        return {name: data.time.toDate(), value: data.value};
      });
      console.log(map1);
      this.multi = [{name: 'czujnikTemp', series: map1}];
    });
  }
}
