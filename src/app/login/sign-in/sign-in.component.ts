import {Component, OnInit} from '@angular/core';
import {AuthService} from '../../auth.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss']
})
export class SignInComponent implements OnInit {
  hide = true;

  constructor(
    public authService: AuthService, public router: Router
  ) {
  }

  ngOnInit(): void {
  }

  forgotPassword(): void {
    this.router.navigate(['login/forgot-password']);
  }

  signUp(): void {
    this.router.navigate(['login/register-user']);
  }
}
