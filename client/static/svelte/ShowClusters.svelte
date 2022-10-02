<script>
import {showClusters} from './stores.js';

let checked = true;

function handleChange() {
  console.log(checked);
  showClusters.set(checked);
};
</script>

<label>
	<input type=checkbox bind:checked={checked} on:click={handleChange}>
	Show Unclustered
</label>
