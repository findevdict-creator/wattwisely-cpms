import { TestBed } from '@angular/core/testing';
import { SideMenuState } from './side-menu-state';

describe('SideMenuState', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => jest.restoreAllMocks());

  it('shows the full menu until it is collapsed', () => {
    expect(TestBed.inject(SideMenuState).isCollapsed()).toBe(false);
  });

  it('collapses and expands the menu, and remembers the choice in this browser', () => {
    const state = TestBed.inject(SideMenuState);

    state.toggle();
    expect(state.isCollapsed()).toBe(true);
    expect(localStorage.getItem(SideMenuState.KEY)).toBe('collapsed');

    state.toggle();
    expect(state.isCollapsed()).toBe(false);
    expect(localStorage.getItem(SideMenuState.KEY)).toBeNull();
  });

  it('starts collapsed when it was left collapsed', () => {
    localStorage.setItem(SideMenuState.KEY, 'collapsed');

    expect(TestBed.inject(SideMenuState).isCollapsed()).toBe(true);
  });

  it('still toggles where the browser keeps nothing', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const state = TestBed.inject(SideMenuState);

    state.toggle();

    expect(state.isCollapsed()).toBe(true);
  });
});
