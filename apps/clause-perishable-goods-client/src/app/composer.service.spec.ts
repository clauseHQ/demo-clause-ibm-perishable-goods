import { TestBed, inject } from '@angular/core/testing';

import { HttpClientModule } from '@angular/common/http';
import { ComposerPerishableGoodsService } from './composer.service';

describe('ComposerPerishableGoodsService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientModule
      ],
      providers: [ComposerPerishableGoodsService]
    });
  });

  it('should be created', inject([ComposerPerishableGoodsService], (service: ComposerPerishableGoodsService) => {
    expect(service).toBeTruthy();
  }));
});
