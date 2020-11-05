import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ClimateComponent} from '../climate/climate.component';
import {ObjectsComponent} from '../objects/objects.component';
import {ReadsComponent} from '../reads/reads.component';
import {SignInComponent} from '../login/sign-in/sign-in.component';
import {ForgotPasswordComponent} from '../login/forgot-password/forgot-password.component';
import {VerifyEmailComponent} from '../login/verify-email/verify-email.component';
import {SignUpComponent} from '../login/sign-up/sign-up.component';
import {AuthGuard} from '../shared/guard/auth.guard';
import {AppBarComponent} from '../app-bar/app-bar.component';
import {LoginBarComponent} from '../login/login-bar.component';


const routes: Routes = [
  {
    path: 'login', component: LoginBarComponent, children: [
      {path: 'sign-in', component: SignInComponent},
      {path: 'register-user', component: SignUpComponent},
      {path: 'forgot-password', component: ForgotPasswordComponent},
      {path: 'verify-email-address', component: VerifyEmailComponent},
    ]
  },
  {
    path: 'meshHome', component: AppBarComponent, canActivate: [AuthGuard], children: [
      {path: 'objects', component: ObjectsComponent, canActivate: [AuthGuard]},
      {path: 'reads', component: ReadsComponent, canActivate: [AuthGuard]},
      {path: 'climate', component: ClimateComponent, canActivate: [AuthGuard]},
    ]
  },
  {path: '', redirectTo: 'meshHome/objects', pathMatch: 'full'},
  {path: '**', redirectTo: 'meshHome/objects', pathMatch: 'full'}

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
