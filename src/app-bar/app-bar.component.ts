import {Component} from '@angular/core';
import {AuthService} from '../app/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app-bar.component.html',
  styleUrls: ['./app-bar.component.scss']
})
export class AppBarComponent {

  constructor(public authService: AuthService) {
  }
}
