import { Component, OnInit } from '@angular/core';
import { ComposerPerishableGoodsService } from './composer.service';
import {Observable} from 'rxjs/Observable';
import * as moment from 'moment';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import {EventCorrelationService} from './event-correlation.service';
import { environment } from '../environments/environment';

declare var $: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Smart Legal Contracts with IBM Blockchain, by Clause';
  urlStatus = 'UNSET';

  step = 0;
  readingCounter = 0;

  CLAUSE_API_REGEX = /https:\/\/api\.clause\.io\/api\/clauses\/([0-9a-z]{24})\/execute\?access_token=[0-9a-zA-Z]{64}/g;

  constructor(public service: ComposerPerishableGoodsService, private http: HttpClient, public events: EventCorrelationService) {}

  public reset(clearClauseURL = false) {
    this.step = 0;
    this.readingCounter = 0;
    this.service.reset();
    if (clearClauseURL) {
      this.urlStatus = 'UNSET';
      this.service.data.shipment.smartClause = '';
    } else {
      this.validateClauseURL(null);
    }
  }

  public validateClauseURL(event) {
    console.log('validating URL');

    if (this.urlStatus === 'UNSET') {
      this.urlStatus = 'LOADING';
      $('#errorMessage').hide();

      // Trim any extra whitespace
      this.service.data.shipment.smartClause = this.service.data.shipment.smartClause.trim();

      // Does it match the regex pattern?
      if (this.CLAUSE_API_REGEX.exec(this.service.data.shipment.smartClause) === null) {
        this.urlStatus = 'INVALID';
        return;
      }
    }

    // Does it accept data?
    this.step += 1;
    const request = {
      '$class': 'org.accordproject.perishablegoods.ShipmentReceived',
      'unitCount': 3000,
      'shipment': {
          '$class': 'org.accordproject.perishablegoods.Shipment',
          'shipmentId': 'SHIP_001',
          'sensorReadings': [
              {
                  '$class': 'org.accordproject.perishablegoods.SensorReading',
                  'centigrade': 2,
                  'humidity': 80,
                  'shipment': 'resource:org.accordproject.perishablegoods.Shipment#SHIP_001',
                  'transactionId': 'a'
              },
              {
                  '$class': 'org.accordproject.perishablegoods.SensorReading',
                  'centigrade': 5,
                  'humidity': 90,
                  'shipment': 'resource:org.accordproject.perishablegoods.Shipment#SHIP_001',
                  'transactionId': 'b'
              },
              {
                  '$class': 'org.accordproject.perishablegoods.SensorReading',
                  'centigrade': 15,
                  'humidity': 65,
                  'shipment': 'resource:org.accordproject.perishablegoods.Shipment#SHIP_001',
                  'transactionId': 'c'
              }
          ]
      },
      'transactionId': '99c64b8a-b3b0-408a-8ec4-7820776cd447',
      'timestamp': '2018-02-18T11:11:41.264Z'
    };

    this.http.post(this.service.data.shipment.smartClause, request)
    .subscribe(() => {
      this.urlStatus = 'VALID';

      // Test connectivity to IBM Blockchain Platform
      this.step += 1;
      this.service.ping().subscribe(() => {

        // Create the Grower
        this.step += 1;
        this.service.addParticipant('Grower').subscribe((grower: any) => {
          this.events.transactionSent(grower.transactionId, () => {
            this.service.data.grower = grower.participant;
            this.service.getHistorian();
            this.step += 1;

            // Create the Importer
            this.service.addParticipant('Importer').subscribe((importer: any) => {
              this.events.transactionSent(importer.transactionId, () => {
                this.service.data.importer = importer.participant;
                this.service.getHistorian();
                this.step += 1;
              });
            }, err => { this.service.handleError(err); this.step *= -1; });
          });
        }, err => { this.service.handleError(err); this.step *= -1; });
      }, err => { this.service.handleError(err); this.step *= -1; });
    }, err => { this.service.handleError(err); this.step *= -1; }
  );
  }


  public addShipment() {
    this.service.addShipment().subscribe((shipment: any) => {
      this.events.transactionSent(shipment.transactionId, () => {
        this.service.data.shipment.status = this.service.Status.IN_TRANSIT;
        this.service.getHistorian();
        this.step = 6;
      });
    }, err => { this.service.handleError(err); this.step *= -1; });
  }

  public sendReceived() {
    this.service.sendReceived().subscribe((tx: any) => {
      this.events.transactionSent(tx.transactionId, () => {
        this.service.data.shipment.status = this.service.Status.ARRIVED;
        this.service.getParticipants();
        this.service.getHistorian();
        this.step = 8;
        $('html, body').stop().animate({
            scrollTop: ($('#complete').offset().top - 400)
        }, 1250, 'easeInOutExpo');
      });
    }, err => this.service.handleError(err));
  }

  public showAddReadingModal() {
    $('#new-reading-modal')
      .modal('show')
    ;
  }

  public addReading() {
    this.service.sendSensorReading().subscribe((tx: any) => {
      this.events.transactionSent(tx.transactionId, () => {
        this.service.getHistorian();
        this.readingCounter += 1;
      });
    }, err => this.service.handleError(err));
  }

  public fromNow(date) {
    return moment(date).fromNow();
  }

  public extractTypeFromFQType(fqt) {
    const xs = fqt.split('.');
    return xs[xs.length - 1];
  }



  public draftedContract() {
    this.step = 1;
  }

  public buildChecklistStyle(step) {
    return {
      'minus': this.step >= 0 && this.step < step,
      'times': this.step === -(step),
      'red': this.step === -(step),
      'check': this.step > step,
      'green': this.step > step,
      'spin spinner': this.step === step,
    };
  }

  public ngOnInit() {
    // Make websocket connection
    const WebSocket = window['WebSocket'] || window['MozWebSocket'];

    const connection = new WebSocket(`ws://${window.location.hostname}${environment.wsUrl}`);

    connection.onopen = function () {
      console.log('connected to websocket');
    };

    connection.onerror = function (error) {
      console.error(error);
    };

    connection.onmessage = (message) => {
        const json = JSON.parse(message.data);
        this.events.eventReceived(json.eventId);
    };

    $(document).ready(function() {

      // fix menu when passed
      $('.masthead')
      .visibility({
        once: false,
        onBottomPassed: function() {
          $('.fixed.menu').transition('fade in');
        },
        onBottomPassedReverse: function() {
          $('.fixed.menu').transition('fade out');
        }
      });

      // create sidebar and attach to menu open
      $('.ui.sidebar').sidebar('attach events', '.toc.item');

        $('.message .close')
          .on('click', function() {
            $(this)
            .closest('.message')
            .transition('fade')
            ;
          });

          $('.dropdown').dropdown();
          $('.ui.checkbox').checkbox();
      }
    );

    // jQuery for page scrolling feature - requires jQuery Easing plugin
    $('a.page-scroll').bind('click', function(event) {
      const $anchor = $(this);
      $('html, body').stop().animate({
          scrollTop: ($($anchor.attr('href')).offset().top - 50)
      }, 1250, 'easeInOutExpo');
      event.preventDefault();
    });

    this.service.ping();
    $('#errorMessage').hide();

  }
}
