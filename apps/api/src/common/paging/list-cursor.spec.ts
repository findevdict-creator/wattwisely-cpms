import { ListCursor } from './list-cursor';

describe('ListCursor', () => {
  const id = '0190a8e2-0000-7000-8000-000000000001';

  it('reads back what it wrote, even when the key holds the separator', () => {
    const cursor = ListCursor.parse(new ListCursor('mall | west', id).toString());

    expect(cursor).toEqual(new ListCursor('mall | west', id));
  });

  it('refuses values it did not make', () => {
    expect(ListCursor.parse('nonsense')).toBeNull();
    expect(ListCursor.parse(Buffer.from('name|not-a-uuid').toString('base64url'))).toBeNull();
  });
});
