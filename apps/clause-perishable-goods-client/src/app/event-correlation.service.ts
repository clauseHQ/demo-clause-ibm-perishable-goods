import { Injectable } from '@angular/core';

/**
 * Helper Module to match outbound composer transactions with inbound events in the client.
 * This assumes that each transaction only emits a single event
 */
@Injectable()
export class EventCorrelationService {

  constructor() {}

  private sentTxns = {};
  private receivedEvents = {};

  public eventReceived(eventId: string) {
    console.log('event received', eventId);
    // Use everything before the '#' as the transaction id
    const txId = eventId.match(/[\w]+[^#]/)[0];
    console.log('txId', txId);
    if (Object.keys(this.sentTxns).includes(txId)) {
      this.sentTxns[txId]();
      delete this.sentTxns[txId];
    } else {
      this.receivedEvents[txId] = 0;
    }
  }

  public transactionSent(txId: string, callback: Function) {
    console.log('transaction sent', txId);
    if (Object.keys(this.receivedEvents).includes(txId)) {
      callback();
      delete this.receivedEvents[txId];
    } else {
      this.sentTxns[txId] = callback;
    }
  }

 }
