<script>
import {data, colourBy} from './stores.js';

var columns = [];
var fetchedColumns;

var selectedColumn;
$: colourBy.set([selectedColumn, getColourScaleType(selectedColumn)]);

function isContinuousColumn(elems) {
  var p1 = elems.some(elem => /^\-?[0-9]*\.?[0-9]+$/.test(elem));
  var p2 = [...new Set(elems)].length > (elems.length / 2);
  return p1 && p2;
};

function isCategoricalColumn(elems) {
  var p1 = [...new Set(elems)].length <= 250;
  var p2 = elems.some(elem => /^\w[\w\s]*$/.test(elem));
  return p1 && p2;
};

function getColourScaleType(column) {
  if (['x', 'y', 'index'].includes(column)) {
    return 'none';
  }

  var elems = $data.map(d => d[column]);

  if (isContinuousColumn(elems)) {
    return 'continuous';
  } else if (isCategoricalColumn(elems)) {
    return 'categorical';
  } else {
    return 'none';
  }
};

function fetchColumns() {
  if (($data.length !== 0) && (!fetchedColumns)) {
    columns = Object.keys($data[0]);
    console.log(columns.map(c => [c, getColourScaleType(c)]));
    columns = columns.filter(column => getColourScaleType(column) !== 'none');
    colourBy.set([columns[0], getColourScaleType(columns[0])]);
    selectedColumn = columns[0];
    fetchedColumns = true;
  }
};

data.subscribe(() => {
  fetchColumns();
});

colourBy.subscribe(value => {
  if (value.length > 0) {
    selectedColumn = value[0];
  }
})

</script>

<label>
Colour By:
<select class="settings-component" name="select-colour-column" id="select-colour-column" bind:value={selectedColumn}>
  {#each columns as column}
    <option value={column}>
      {column}
    </option>
  {/each}
</select>
</label>

<style>
</style>
