<script>
  let { value = 0, duration = 400, format = (n) => n.toString(), class: className = '' } = $props();

  let displayValue = $state(value);
  let prevValue = $state(value);
  let animating = $state(false);

  $effect(() => {
    const newVal = value;
    const oldVal = displayValue;
    
    if (newVal === oldVal) return;
    
    animating = true;
    prevValue = oldVal;
    
    const startTime = performance.now();
    const diff = newVal - oldVal;
    
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      displayValue = oldVal + diff * eased;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        displayValue = newVal;
        animating = false;
      }
    }
    
    requestAnimationFrame(animate);
  });

  // Keep value as number for calculations
  let numericValue = $derived(typeof displayValue === 'number' ? displayValue : parseFloat(String(displayValue).replace(/[^0-9.-]/g, '')) || 0);
</script>

<span class="animated-number {className}" class:animating>
  {format(numericValue)}
</span>

<style>
  .animated-number {
    font-variant-numeric: tabular-nums;
    transition: color 0.15s ease;
  }
</style>
