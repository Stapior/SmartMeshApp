import {Component, OnInit} from '@angular/core';
import {ObjectsStore} from './objects-store.service';
import {MeshObject} from './object';
import {BehaviorSubject, combineLatest, Observable} from 'rxjs';
import {MatSelectChange} from '@angular/material/select';
import {map} from 'rxjs/operators';
import {MatButtonToggle} from '@angular/material/button-toggle';

@Component({
  selector: 'app-objects',
  templateUrl: './objects.component.html',
  styleUrls: ['./objects.component.scss']
})
export class ObjectsComponent implements OnInit {

  getUrl()
  {
     return 'url(\'/assets/images/background.png\')';
  };

  types: Observable<string[]>;

  objects$: Observable<MeshObject[]>;
  type: BehaviorSubject<string> = new BehaviorSubject('all');
  currentType = 'all';

  constructor(private objectsStore: ObjectsStore) {
  }

  ngOnInit(): void {
    this.types = this.objectsStore.getAllObjects().pipe(map(objects => objects.map(object => object.objectType)),
      map(types => ['all', ...new Set(types)]));
    this.objects$ = combineLatest([this.objectsStore.getAllObjects(), this.type]).pipe(map(([objects, type]) => objects.filter(object => {
      if (type && type !== 'all') {
        return object.objectType === type;
      }
      return true;
    })));
  }

  updateCourse(object: MeshObject): void {
    this.objectsStore.update(object);
  }

  onChangeType(value: string): void {
    this.type.next(value);
  }
}
