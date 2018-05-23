import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app.component';
import { ComposerPerishableGoodsService } from './composer.service';
import { FormsModule } from '@angular/forms';
import { EventCorrelationService } from './event-correlation.service';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [ComposerPerishableGoodsService, EventCorrelationService],
  bootstrap: [AppComponent]
})
export class AppModule { }
