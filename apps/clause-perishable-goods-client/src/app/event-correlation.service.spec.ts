import { TestBed, inject } from '@angular/core/testing';

import { EventCorrelationService } from './event-correlation.service';

describe('ComposerPerishableGoodsService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
      ],
      providers: [EventCorrelationService]
    });
  });

  it('should be created', inject([EventCorrelationService], (service: EventCorrelationService) => {
    expect(service).toBeTruthy();
  }));
});
