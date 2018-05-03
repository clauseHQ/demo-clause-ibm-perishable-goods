import { AppPage } from './app.po';

describe('clause-composer-perishable-goods-client App', () => {
  let page: AppPage;

  beforeEach(() => {
    page = new AppPage();
  });

  it('should display welcome message', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toContain(
      `Connected Contracting.`
    );
  });
});
