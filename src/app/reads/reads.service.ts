import { Injectable } from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class ReadsService {
  constructor(private firestore: AngularFirestore) {
    firestore.collection('objects').snapshotChanges().subscribe(value => {
      const map1 = value.map(e => {
          return {
            id: e.payload.doc.id,
            ...e.payload.doc.data()
          };
        }
      );
      console.log(map1);
    });
    const from = new Date();
    from.setMinutes(from.getMinutes() - 1);
    firestore.collection('objects/19/reads', ref => ref.where('time', '>', from)).snapshotChanges().subscribe(value => {
      const map1 = value.map(e => e.payload.doc.data().value);
      console.log(map1);
    });

  }
}
