import {Component} from '@angular/core';
import {AuthService} from '../auth.service';
import {Router} from '@angular/router';


@Component({
  selector: 'app-root',
  templateUrl: './login-bar.component.html',
  styleUrls: ['./login-bar.component.scss']
})
export class LoginBarComponent {

  constructor(public authService: AuthService, private router: Router) {
  }

  navigateTologin(): void {
    this.router.navigate(['login/sign-in']);
  }
}
