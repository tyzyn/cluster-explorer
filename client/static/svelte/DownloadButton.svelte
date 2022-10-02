<script>
import {data} from './stores.js';
import tsv from 'tsv';

var downloadAll = false;
function downloadFile() {
    console.log('download');
    var fileLink = window.document.createElement('a');

    var filteredData;
    if (downloadAll) {
      filteredData = $data;
    } else {
      filteredData = $data.filter(d => d.label !== "");
    }

    var tsvData = new Blob([tsv.stringify(filteredData)], {type: 'text/plain'});

    fileLink.href = window.URL.createObjectURL(tsvData);
    fileLink.download = 'cluster_explorer.data.tsv';

    document.body.appendChild(fileLink);
    fileLink.click();
    document.body.removeChild(fileLink);
  };
</script>

<label>
<input type=checkbox bind:checked={downloadAll}>
Download All
</label>
<button class="settings-component" on:click={downloadFile}>Download TSV</button>

<style>
label {
  margin-right: 20px;
}
</style>
