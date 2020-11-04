import { Component, OnInit } from '@angular/core';
import {ObjectsStore} from './objects-store.service';
import {MeshObject} from './object';
import {Observable} from 'rxjs';

@Component({
  selector: 'app-objects',
  templateUrl: './objects.component.html',
  styleUrls: ['./objects.component.scss']
})
export class ObjectsComponent implements OnInit {

  objects$: Observable<MeshObject[]>;

  constructor(private objectsStore: ObjectsStore) { }

  ngOnInit(): void {
    this.objects$ = this.objectsStore.getAllObjects();
  }

  updateCourse(object: MeshObject): void {
    this.objectsStore.update(object);
  }
}
