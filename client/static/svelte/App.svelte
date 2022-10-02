<script>

  import {onMount} from 'svelte';
  import Papa from 'papaparse';
  import {data, labels} from './stores.js';

  import Scatter from './Scatter.svelte';
  import Settings from './Settings.svelte';

  onMount(async () => {
    var dataUrl = `http://95.216.141.17:5003/client/static/data/${token}/scatter.csv`;
    fetch(dataUrl)
      .then(d => d.text())
      .then(d => Papa.parse(d, {header: true, skipEmptyLines: true})['data'])
      .then(d => {for (var i in d) {d[i]['index'] = parseInt(i);}; return d})
      .then(d => {data.set(d)})
      .catch(err => {console.log(err)});

    var labelsUrl = `http://95.216.141.17:5003/client/static/data/${token}/labels.csv`;
    fetch(labelsUrl)
      .then(d => d.text())
      .then(d => Papa.parse(d, {header: true, skipEmptyLines: true})['data'])
      .then(d => {labels.set(d)})
      .catch(err => {console.log(err)});
  });

</script>

<div class="grid-container">
  <Scatter/>
  <Settings/>
</div>

<style>
.grid-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: 20px;
}
</style>
