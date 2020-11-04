import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import {BehaviorSubject, Observable} from 'rxjs';
import {MeshObject} from './object';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ObjectsStore {
  objects: BehaviorSubject<MeshObject[]> = new BehaviorSubject([]);
  objects$: Observable<MeshObject[]> = this.objects.asObservable();

  constructor(private firestore: AngularFirestore) {
    firestore.collection<MeshObject>('objects').snapshotChanges().pipe(map(value => value.map(e => {
      return {
        id: e.payload.doc.id,
        ...e.payload.doc.data()
      } as MeshObject;
    }))).subscribe(value => this.objects.next(value));
  }

  getAllObjects(): Observable<MeshObject[]> {
    return this.objects$;
  }

  public getTempSensors(): Observable<MeshObject[]> {
    return this.filterByObjectType('tempSensor');
  }

  private filterByObjectType(type: string): Observable<MeshObject[]> {
    return this.objects$.pipe(map(value => value.filter(object => object.objectType === type)));
  }

  update(object: MeshObject): Promise<void> {
    const objCopy = {...object};
    delete objCopy.id;
    return this.firestore.doc('objects/' + object.id).update(objCopy);
  }
}

