<script>
import {data, tag} from './stores.js';

var tags = [];
var fetchedTags = false;

function fetchTags() {
  if (($data.length !== 0) && (!fetchedTags)) {
    tags = [...new Set($data.map(d => d.label).filter(d => d !== ''))];
    console.log(tags);
    tag.set(tags[0]);
    fetchedTags = true;
  }
};

data.subscribe(() => {
  fetchTags();
});

</script>

<select class="settings-component" name="select-tag" id="select-tag" bind:value={$tag}>
  {#each tags as tag}
    <option value={tag}>
      {tag}
    </option>
  {/each}
  <option value="Add Label">Add Label</option>
</select>

<div class="add-label">
{#if $tag === "Add Label"}
  <input class="settings-component" type=search>
{/if}
</div>

<style>
.add-label {
  display: block;
}
</style>
