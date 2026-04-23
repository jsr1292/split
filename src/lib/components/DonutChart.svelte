<script>
  let { data = [], size = 120, strokeWidth = 16 } = $props();

  // Category colors palette
  const categoryColors = {
    food: '#ff6b6b',
    transport: '#4ecdc4',
    accommodation: '#45b7d1',
    activities: '#96ceb4',
    drinks: '#dda0dd',
    shopping: '#ffb347',
    utilities: '#87ceeb',
    health: '#98d8c8',
    other: '#c9a84c'
  };

  // Calculate total
  let total = $derived(data.reduce((sum, d) => sum + d.value, 0));

  // If only 1 category or no data, don't show
  let shouldShow = $derived(data.length > 1 && total > 0);

  // SVG parameters
  let radius = $derived((size - strokeWidth) / 2);
  let circumference = $derived(2 * Math.PI * radius);
  let center = $derived(size / 2);

  // Calculate segments
  let segments = $derived(() => {
    if (!shouldShow) return [];

    let currentOffset = 0;
    return data.map((item, i) => {
      const pct = item.value / total;
      const dashLen = pct * circumference;
      const dashGap = circumference - dashLen;
      const rotation = (currentOffset / circumference) * 360 - 90; // Start from top
      currentOffset += dashLen;

      return {
        ...item,
        dashArray: `${dashLen} ${dashGap}`,
        rotation,
        color: item.color || categoryColors[item.category] || categoryColors.other,
        dashOffset: 0 // Will animate
      };
    });
  });

  let animated = $state(false);
  
  $effect(() => {
    // Trigger animation after mount
    setTimeout(() => { animated = true; }, 50);
  });
</script>

{#if shouldShow}
  <div class="donut-chart" style="width: {size}px; height: {size}px;">
    <svg width={size} height={size} viewBox="0 0 {size} {size}">
      <!-- Background circle -->
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.04)"
        stroke-width={strokeWidth}
      />
      
      <!-- Segments -->
      {#each segments() as seg, i}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={seg.color}
          stroke-width={strokeWidth}
          stroke-dasharray={seg.dashArray}
          stroke-dashoffset={animated ? 0 : -circumference}
          stroke-linecap="butt"
          transform="rotate({seg.rotation} {center} {center})"
          style="
            transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1) {i * 80}ms;
          "
        />
      {/each}
    </svg>
    
    <!-- Center text -->
    <div class="donut-center" style="width: {size}px; height: {size}px;">
      <span class="donut-total">{total.toFixed(0)}</span>
    </div>
  </div>

  <!-- Legend -->
  <div class="donut-legend">
    {#each data as item}
      <div class="donut-legend-item">
        <span class="donut-legend-dot" style="background: {item.color || categoryColors[item.category] || categoryColors.other};"></span>
        <span class="donut-legend-label">{item.category}</span>
        <span class="donut-legend-pct">{Math.round((item.value / total) * 100)}%</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  .donut-chart {
    position: relative;
    margin: 0 auto 16px;
  }

  .donut-center {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .donut-total {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 20px;
    font-weight: 700;
    color: var(--gold);
  }

  .donut-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    justify-content: center;
    margin-bottom: 16px;
  }

  .donut-legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
  }

  .donut-legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .donut-legend-label {
    color: var(--text2);
    text-transform: capitalize;
  }

  .donut-legend-pct {
    color: var(--text3);
    font-variant-numeric: tabular-nums;
  }
</style>
