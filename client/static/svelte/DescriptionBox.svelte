<script>
import {hoverText, searchValue} from './stores.js';

function formatText(text) {
    text = text.slice(0, 1000) + ((text.length > 1000) ? "..." : "");

    if ($searchValue !== '') {
      try {
        var regex = new RegExp('\\b(' + $searchValue + ')\\b', 'ig');
        text = text.replaceAll(regex, '<span class="text-highlight">$1</span>')
      } catch (error) {
          console.error(error);
          return
      };
    }

  return text
}
</script>

<div class="description-box">
<p>{@html formatText($hoverText)}</p>
</div>

<style>
.description-box {
  clear: left;
}
</style>
