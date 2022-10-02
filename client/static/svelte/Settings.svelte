<script>
  import {data, labels} from './stores.js';
  import Search from './Search.svelte';
  import CheckboxUnclustered from './CheckboxUnclustered.svelte';
  import CheckboxLabels from './CheckboxLabels.svelte';
  import DescriptionBox from './DescriptionBox.svelte';
  import LassoToggle from './LassoToggle.svelte';
  import ColourSelect from './ColourSelect.svelte';
  import DownloadButton from './DownloadButton.svelte';

  function countData(data) {
    return data.length;
  };
</script>

<div class="settings">
  <center><h3>Cluster Explorer</h3></center>
  <Search/>
  <hr>
  <div class="checkbox-container">
    <CheckboxUnclustered/>
    <CheckboxLabels/>
  </div>
  <hr>
  <div class="colour-container">
    <ColourSelect/>
  </div>
    <hr>
  <div class="lasso-container">
    <LassoToggle/>
  </div>
    <hr>
  <div class="download-container">
    <DownloadButton/>
  </div>
    <hr>
  <DescriptionBox/>
</div>

<style>
.settings {
  /* background-color: gray; */
  box-sizing: border-box;
  padding: 10px;
  position: relative;
  height: 100%;
}

:global(.settings-component) {
  height: 30px;
}

.checkbox-container, .lasso-container, .colour-container, .download-container {
  width: 100%;
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
  }
</style>
