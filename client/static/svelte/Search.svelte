<script>
import {data, searchValue, textField, searchMap, searchMode} from './stores.js';

var columns = [];
var fetchedColumns;

var selected = 0;
var searchNum = 1;
var searchMapLocal = [{'value':'', 'field':'', 'negate':false}];

function fetchColumns() {
  if (($data.length !== 0) && (!fetchedColumns)) {
    columns = Object.keys($data[0]);
    columns = columns.filter(column => !$data.every(d => /^\-?[0-9]*\.?[0-9]+$/.test(d[column])));

    textField.set(columns[0]);

    searchMapLocal.forEach(d => d['field'] = columns[0]);
    fetchedColumns = true;
  }
};

data.subscribe(() => {
  fetchColumns();
})

searchMap.subscribe(value => {
  console.log(value);
})

function handleSearch(d) {
  $searchMap = searchMapLocal;
  selected = d3.selectAll("circle").filter(".selected").data().length;
}

var text = $searchValue;
$: if (text === '') {
  handleSearch();
};

function increment() {
  searchNum += 1;
  searchMapLocal.push({'value':'', 'field':columns[0], 'negate':false});
  $searchMap = searchMapLocal;
  selected = d3.selectAll("circle").filter(".selected").data().length;
}

function decrement() {
  searchNum -= 1;
  searchMapLocal.pop();
  $searchMap = searchMapLocal;
  selected = d3.selectAll("circle").filter(".selected").data().length;
}

function negate(i) {
  searchMapLocal[i]['negate'] = !searchMapLocal[i]['negate'];
  $searchMap = searchMapLocal;
  selected = d3.selectAll("circle").filter(".selected").data().length;
}

function modeChange() {
  $searchMode = event.currentTarget.value;
}
</script>

<center><p>{selected} Selected</p></center>

{#each Array(searchNum) as _, i}
  <div class="search-container">
    <div style="float:left; margin-right:10px">
      <button class:active={searchMapLocal[i]['negate']} class="settings-component" on:click="{() => negate(i)}">!</button>
    </div>

    <div style="float:left; margin-right:10px">
      <input class="settings-component" type=search bind:value={searchMapLocal[i]['value']} on:search={handleSearch}>
    </div>

    <div style="float:left;">
      <select class="settings-component" name="text-to-search" id="text-to-search" bind:value={searchMapLocal[i]['field']} on:change={handleSearch}>
        {#each columns as column}
          <option value={column}>
            {column}
          </option>
        {/each}
      </select>
    </div>

    {#if i == searchNum-1}
    <div style="float:left; margin-left:10px">
      <button class="settings-component" on:click={increment}>+</button>
    </div>
    {/if}
    {#if (i == searchNum-1) && (i != 0)}
    <div style="float:left; margin-left:10px">
      <button class="settings-component" on:click={decrement}>-</button>
    </div>
    {/if}
  </div>
{/each}

<div class="search-container">
  <label>
    <input checked={$searchMode==="conjunction"} on:change={modeChange} type="radio" name="amount" value="conjunction"/> Conjunction
  </label>
  <label>
    <input checked={$searchMode==="disjunction"} on:change={modeChange} type="radio" name="amount" value="disjunction"/> Disjunction
  </label>
</div>

<style>
.search-container {
  width: 100%;
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
}

.active {
	background-color: pink;
}

#text-to-search {
  width: 100%;
}
</style>
