<script>
  import {data, tag, lassoMode, lassoSelected} from './stores.js';

  var newLabel = "";
  var tags = [];
  var fetchedTags = false;

  function handleClick(mode) {
    lassoMode.set(mode);
  }

  function fetchTags() {
    if (($data.length !== 0) && (!fetchedTags)) {
      tags = [...new Set($data.map(d => d.label).filter(d => d !== ''))];
      console.log(tags);
      if (tags.length === 0) {
        tag.set('Add Label');
      } else {
        tag.set(tags[0]);
      }
      fetchedTags = true;
    }
  };

  function handleAddLabel() {
    tags.push(newLabel);
    tags = tags;
    tag.set(newLabel);
    newLabel = '';
  };

  data.subscribe(() => {
    fetchTags();
  });

  tag.subscribe(value => {
    if (value === "Add Label") {
      lassoMode.set('zoom');
    };
  })
</script>

<div class="container">
  <div class="grid1">
    <button class="settings-component" class:active={$lassoMode === 'zoom'} on:click="{() => handleClick('zoom')}">Zoom</button>
  </div>
  <div class="grid2">
    {#if $tag === "Add Label"}
      <button class="settings-component" disabled>Lasso</button>
    {:else}
      <button class="settings-component" class:active={$lassoMode === 'lasso'} on:click="{() => handleClick('lasso')}">Lasso</button>
    {/if}
  </div>
  <div class="grid3">
    {#if $tag === "Add Label"}
      <button class="settings-component" disabled>Erase</button>
    {:else}
      <button class="settings-component" class:active={$lassoMode === 'erase'} on:click="{() => handleClick('erase')}">Erase</button>
    {/if}
  </div>
  <div class="grid4">
    <select class="settings-component" name="select-tag" id="select-tag" bind:value={$tag}>
      {#each tags as tag}
        <option value={tag}>
          {tag}
        </option>
      {/each}
      <option value="Add Label">Add Label</option>
    </select>
  </div>
  <div class="grid5">
    <center>
    <div class="add-label">
    {#if $tag === "Add Label"}
      <input class="settings-component" type=search bind:value={newLabel} on:search={handleAddLabel}>
    {:else}
      <input class="settings-component" type=search disabled>
    {/if}
    </div>
    </center>
  </div>
  <div class="grid6">
  <center>
  <label>
  	<input type=checkbox bind:checked={$lassoSelected}>
  	Lasso Selected
  </label>
  </center>
  </div>
</div>

<style>
.add-label {
  margin-top: 5px;
}

.active {
	background-color: pink;
}

.settings-component {
  margin-right: 10px;
}

.container {
  display: grid;
  grid-template-columns: .5fr .5fr .5fr;
  grid-template-rows: 1fr 1fr .5fr;
  gap: 0px 0px 0px;
  grid-auto-flow: row;
  grid-template-areas:
    "grid1 grid2 grid3"
    "grid4 grid4 grid4"
    "grid5 grid5 grid5"
    "grid6 grid6 grid6";
}

.grid1 { grid-area: grid1; }

.grid2 { grid-area: grid2; }

.grid3 { grid-area: grid3; }

.grid4 { grid-area: grid4; }

.grid5 { grid-area: grid5; }

.grid6 { grid-area: grid6; }
</style>
