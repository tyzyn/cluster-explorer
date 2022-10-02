import { writable } from 'svelte/store';
import Papa from 'papaparse';

export const data = writable([]);
export const labels = writable([]);

export const showUnclustered = writable(true);
export const showLabels = writable(true);

export const textField = writable('');
export const searchValue = writable('');
export const searchMap = writable([{'value':'', 'field':'', 'negate':false}]);
export const searchMode = writable('conjunction');

export const hoverText = writable('');
export const lassoMode = writable('zoom');
export const lassoSelected = writable(false);
export const tag = writable('');
export const colourBy = writable([]);
