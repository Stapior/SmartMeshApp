import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {AngularFireModule} from '@angular/fire';
import {AngularFireDatabaseModule} from '@angular/fire/database';
import {environment} from '../environments/environment';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MaterialModule} from './material/material.module';
import {RouterModule} from '@angular/router';
import {AppRoutingModule} from './routing/app-routing.module';
import {ObjectsComponent} from './objects/objects.component';
import {ClimateComponent} from './climate/climate.component';
import {ReadsComponent} from './reads/reads.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {AngularFireAuthModule} from '@angular/fire/auth';
import {SignInComponent} from './login/sign-in/sign-in.component';
import {SignUpComponent} from './login/sign-up/sign-up.component';
import {ForgotPasswordComponent} from './login/forgot-password/forgot-password.component';
import {VerifyEmailComponent} from './login/verify-email/verify-email.component';
import {AppBarComponent} from './app-bar/app-bar.component';
import {LoginBarComponent} from './login/login-bar.component';
import {FlexLayoutModule} from '@angular/flex-layout';
import {NgxChartsModule} from '@swimlane/ngx-charts';
import {MatFormFieldModule} from '@angular/material/form-field';
import {NgxMaterialTimepickerModule} from 'ngx-material-timepicker';



@NgModule({
  declarations: [
    AppComponent,
    ObjectsComponent,
    ClimateComponent,
    ReadsComponent,
    SignInComponent,
    SignUpComponent,
    ForgotPasswordComponent,
    VerifyEmailComponent,
    AppBarComponent,
    LoginBarComponent
  ],
  imports: [
    BrowserModule,
    AngularFireModule.initializeApp(environment.firebaseConfig),
    AngularFireDatabaseModule,
    AngularFireAuthModule,
    BrowserAnimationsModule,
    MaterialModule,
    RouterModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    FlexLayoutModule,
    MatFormFieldModule,
    NgxMaterialTimepickerModule,
    NgxChartsModule
    
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
