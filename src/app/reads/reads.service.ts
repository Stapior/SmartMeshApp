import {Injectable} from '@angular/core';
import {MeshObject} from '../objects/object';

@Injectable({
  providedIn: 'root'
})
export class ReadsService {
  preSelectedSensor: MeshObject;

  constructor() {

  }

}
