import {Component, OnInit} from '@angular/core';
import {ObjectsStore} from './objects-store.service';
import {MeshObject} from './object';
import {BehaviorSubject, combineLatest, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {ReadsService} from '../reads/reads.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-objects',
  templateUrl: './objects.component.html',
  styleUrls: ['./objects.component.scss']
})
export class ObjectsComponent implements OnInit {
  types: Observable<string[]>;

  objects$: Observable<MeshObject[]>;
  type: BehaviorSubject<string> = new BehaviorSubject('all');
  currentType = 'all';

  constructor(private objectsStore: ObjectsStore, private readsService: ReadsService, private router: Router) {
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

  changeValue(event: Event, object: MeshObject): void {
    event.stopPropagation();
    this.objectsStore.changeValue(object);
  }

  trackByObjectId(index: number, object: MeshObject): string {
    return object.id;
  }

  goToValues($event: MouseEvent, object: MeshObject): void {
    $event.stopPropagation();
    this.readsService.preSelectedSensor = object;
    this.router.navigate(['meshHome/reads']);
  }
}
