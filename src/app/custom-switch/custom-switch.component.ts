import {Component, OnInit} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {MeshObject} from '../objects/object';
import {AngularFirestore} from '@angular/fire/firestore';
import {map} from 'rxjs/operators';
import firebase from 'firebase';
import DocumentReference = firebase.firestore.DocumentReference;

@Component({
  selector: 'app-custom-switch',
  template: `
    <div class="content main-content">
      <div class="switches-container">
        <mat-grid-list cols="4" rowHeight="150px" gutterSize="10px">
          <mat-grid-tile class="tile"
                         *ngFor="let tile of switches$ | async">
            <div fxLayout="column" class="tile-container">
              <div>{{tile.name}}</div>
              <button mat-raised-button (click)="emitSwitchEvent(tile)">
                <span>Emit switch event</span>
              </button>
              <button class="mdc-fab mdc-fab--mini" aria-label="Delete" (click)="delete(tile)">
                <div class="mdc-fab__ripple"></div>
                <span class="mdc-fab__icon material-icons">delete</span>
              </button>
            </div>
          </mat-grid-tile>
          <mat-grid-tile *ngIf="adding" class="tile">
            <div fxLayout="column" class="tile-container">
              <div>Add own switch</div>
              <input matInput [(ngModel)]="newName" name="newSwitchName" [placeholder]="'Enter switch name'"/>
              <button mat-raised-button [disabled]="!newName" (click)="addNewSwitch()">
                <span>Add new switch</span>
              </button>
            </div>
          </mat-grid-tile>
        </mat-grid-list>
      </div>
      <div class="fab-container">
        <button class="mdc-fab" aria-label="Favorite" [disabled]="adding" (click)="addSwitch()">
          <div class="mdc-fab__ripple"></div>
          <span class="mdc-fab__icon material-icons">add</span>
        </button>
      </div>
    </div>

  `,
  styleUrls: ['./custom-switch.component.scss']
})
export class CustomSwitchComponent implements OnInit {
  switches$: Observable<MeshObject[]>;
  switches: BehaviorSubject<MeshObject[]> = new BehaviorSubject<MeshObject[]>([]);
  adding = false;
  newName = '';

  constructor(private firestore: AngularFirestore) {
    firestore.collection<MeshObject>('switches').snapshotChanges().pipe(map(value => value.map(e => {
      return {
        id: e.payload.doc.id,
        ...e.payload.doc.data()
      } as MeshObject;
    }))).subscribe(value => this.switches.next(value));
  }

  ngOnInit(): void {
    this.switches$ = this.switches.asObservable();
  }

  addSwitch(): void {
    this.adding = true;
  }

  emitSwitchEvent(customSwitch: MeshObject): void {
    this.firestore.collection('switchesChanges').add({
      nodeId: customSwitch.nodeId,
      objectId: customSwitch.objectId,
      value: 1,
      done: false
    });
  }

  delete(tile: MeshObject): void {
    this.firestore.collection('switches').doc(tile.id).delete();
  }

  getRandomInt(): number {
    const min = 100000;
    const max = 999999999999999;
    return Math.floor(Math.random() * (max - min)) + min;
  }

  addNewSwitch(): Promise<DocumentReference> {
    return this.firestore.collection('switches').add({
      nodeId: this.getRandomInt(),
      objectId: this.getRandomInt(),
      name: this.newName,
      added: false
    });
  }
}
