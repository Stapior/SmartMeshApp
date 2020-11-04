import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ClimateComponent} from '../climate/climate.component';
import {ObjectsComponent} from '../objects/objects.component';
import {ReadsComponent} from '../reads/reads.component';


const routes: Routes = [
  {path: 'objects', component: ObjectsComponent},
  {path: 'reads', component: ReadsComponent},
  {path: 'climate', component: ClimateComponent},
  {path: '**', redirectTo: 'objects', pathMatch: 'full'},

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
