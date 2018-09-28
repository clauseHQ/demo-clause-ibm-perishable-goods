import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../environments/environment';

declare var $: any;

@Injectable()
export class ComposerPerishableGoodsService {

  constructor(private http: HttpClient) {
    this.API_HOST = `${window.location.protocol}//${window.location.host}${environment.apiUrl}`;
  }

  private API_HOST;

  public Status = {
    NOT_CREATED: 0,
    CREATED_PARTICIPANTS: 1,
    CREATING_SHIPMENT: 2,
    IN_TRANSIT: 3,
    ARRIVED: 4,
    FAILED: -1,
  };

  public data: any = {
    shipment: {
      shipmentId: this.generateId(),
      smartClause: '',
      smartClauseKey: '',
      status: this.Status.NOT_CREATED,
      sensorReadings: [],
      currentTemp: 2,
      currentHumidity: 75,
    },
    grower: {
      email: 'grower' + this.generateEmail(),
      accountBalance: 0,
    },
    importer: {
      email: 'importer' + this.generateEmail(),
      accountBalance: 10000,
    },
    historian: []
  };

  blockHeight = -1;

  public reset() {
    this.blockHeight = -1;
    this.data.shipment.shipmentId = this.generateId();
    this.data.shipment.sensorReadings = [];
    this.data.grower = {
      email: 'grower' + this.generateEmail(),
      accountBalance: 0,
    };
    this.data.importer = {
      email: 'importer' + this.generateEmail(),
      accountBalance: 10000,
    };
  }

  public handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error.message);
      $('#errorMessage > div.description').html(error.error.message);
      $('#errorMessage').show();
    } else if (error.error && error.error.message && error.error.status) {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      console.error(
        `Backend returned code ${error.status}, body was: ${error.error.message}`);

      // tslint:disable-next-line:max-line-length
      const message = error.error.message.replace('Error trying invoke business network. Error: No valid responses from any peers.\nResponse from attempted peer comms was an error: Error: 2 UNKNOWN: error executing chaincode: transaction returned with failure: Error:', '');
      $('#errorMessage > div.description').html(message);
      $('#errorMessage').show();
    } else if (error.name === 'HttpErrorResponse') {
      const message = 'Unable to connect to the server. Are you still online?';
      $('#errorMessage > div.description').html(message);
      $('#errorMessage').show();
    } else {
      console.error(error);
    }
  }

  public statusString() {
    for (const k in this.Status) {
      if (this.Status[k] === this.data.shipment.status) {
        return k.replace('_', ' ');
      }
    }
    return 'FAILED';
  }

  public addParticipant(type) {
    let participant;
    if (type === 'Importer') {
      participant = this.data.importer;
    } else if (type === 'Grower') {
      participant = this.data.grower;
    } else {
      throw new Error('Invalid participant type');
    }

    const request = {
      '$class':  'org.accordproject.perishablegoods.Add' + type,
      'participant': {
        '$class': 'org.accordproject.perishablegoods.' + type,
        'email': participant.email,
        'address': {
          country: 'gb'
        },
        'accountBalance': participant.accountBalance
      }
    };

    return this.http.post(this.API_HOST + '/Add' + type, request);
  }

  getParticipants() {
    interface Participant {
      accountBalance: number;
    }
    this.http.get(this.API_HOST + '/Grower/' + (this.data.grower.email)).subscribe(
      data => {
        this.data.grower.accountBalance = (<Participant>data).accountBalance;
      }, err => this.handleError(err));
    this.http.get(this.API_HOST + '/Importer/' + (this.data.importer.email)).subscribe(
      data => {
        this.data.importer.accountBalance = (<Participant>data).accountBalance;
      }, err => this.handleError(err));
  }

  // not guaranteed to be unique, but sufficient for our purposes
  public generateId() {
    return Math.random().toString(36).substr(2, 6);
  }

  private generateEmail() {
    return this.generateId() + '@network';
  }

  public addShipment() {
    this.data.grower.email = encodeURIComponent(this.data.grower.email);
    this.data.importer.email = encodeURIComponent(this.data.importer.email);
    this.data.shipment.status = this.Status.CREATING_SHIPMENT;
    $('#shipment').removeClass('dimmed');
    // console.log(grower);
    return this.http.post(this.API_HOST + '/AddShipment', {
        '$class': 'org.accordproject.perishablegoods.AddShipment',
        shipment: {
          '$class': 'org.accordproject.perishablegoods.Shipment',
          shipmentId: this.data.shipment.shipmentId,
          'status': 'IN_TRANSIT',
          'grower': 'resource:org.accordproject.perishablegoods.Grower#' + this.data.grower.email,
          'importer': 'resource:org.accordproject.perishablegoods.Importer#' + this.data.importer.email,
          smartClause: this.data.shipment.smartClause,
          smartClauseKey: this.data.shipment.smartClauseKey,
        }
      }
    );
  }

  sendSensorReading() {
    return this.http.post(this.API_HOST + '/SensorReading', {
      '$class': 'org.accordproject.perishablegoods.SensorReading',
      'centigrade': this.data.shipment.currentTemp,
      'humidity' : this.data.shipment.currentHumidity,
      'shipment': 'resource:org.accordproject.perishablegoods.Shipment#' + this.data.shipment.shipmentId,
    });
  }

  public getHistorian() {
    console.log('historian called');
    return this.http.get(this.API_HOST + '/system/historian').subscribe(
      data => {
        function compare(a, b) {
          return new Date(a.transactionTimestamp).getTime() - new Date(b.transactionTimestamp).getTime();
        }
        if (this.blockHeight === -1) {
          this.blockHeight = (<Array<any>>data).length - 1;
        }

        this.data.historian = (<Array<any>>data).sort(compare);
        this.data.historian.splice(0, this.blockHeight);
        const lastBlock = (<Array<any>>data).slice(-1).pop();
        if (lastBlock && lastBlock.transactionType === 'org.accordproject.perishablegoods.ShipmentReceived') {
          this.data.historian.push({
            transactionType: 'Clause Triggered',
            transactionTimestamp: lastBlock.transactionTimestamp
          });
        }
      },
      err => {
        this.handleError(err);
      }
    );
  }

  public ping() {
    return this.http.get(this.API_HOST + '/system/ping');
  }

  sendReceived() {
    return this.http.post(this.API_HOST + '/ShipmentReceived', {
        '$class': 'org.accordproject.perishablegoods.ShipmentReceived',
        'unitCount': 3000,
        'shipment': 'resource:org.accordproject.perishablegoods.Shipment#' + this.data.shipment.shipmentId
      }
    );
  }

}
