import {Component, OnInit} from '@angular/core';
import {AuthService} from '../../auth.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss']
})
export class SignUpComponent implements OnInit {
  hide = true;

  constructor(
    public authService: AuthService, private router: Router
  ) {
  }

  ngOnInit(): void {
  }

  signUp(): void {
    this.router.navigate(['login/register-user']);
  }

}
