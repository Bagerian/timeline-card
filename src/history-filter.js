// ------------------------------------
// NEW: Collapse consecutive duplicates
// ------------------------------------
function collapseDuplicates(list, entities, globalConfig) {
  const collapsed = [];
  const lastStates = {};

  for (const item of list) {
    const cfg = entities.find((e) => e.entity === item.id) || {};

    // Entity → YAML → fallback to global
    const collapse =
      cfg.collapse_duplicates ?? globalConfig.collapse_duplicates ?? false;

    if (!collapse) {
      collapsed.push(item);
      continue;
    }

    // Check against the last seen state *for this specific entity*
    const lastState = lastStates[item.id];
    if (item.raw_state !== lastState) {
      collapsed.push(item);
      lastStates[item.id] = item.raw_state;
    }
  }

  return collapsed;
}

export function passesValueFilter(raw_state, cfg) {
  const hasMin = cfg?.min_value != null;
  const hasMax = cfg?.max_value != null;
  if (!hasMin && !hasMax) return true;
  const num = parseFloat(raw_state);
  if (isNaN(num)) return false;
  if (hasMin && num < cfg.min_value) return false;
  if (hasMax && num > cfg.max_value) return false;
  return true;
}

export function filterHistory(items, entities, limit, globalConfig = {}) {
  let filtered = items.filter((ev) => {
    const cfg = entities.find((e) => e.entity === ev.id);
    const include = Array.isArray(cfg?.include_states)
      ? cfg.include_states
      : null;
    const exclude = Array.isArray(cfg?.exclude_states)
      ? cfg.exclude_states
      : null;

    if (include) return include.includes(ev.raw_state);
    if (exclude) return !exclude.includes(ev.raw_state);
    return true;
  });

  // Value-based filter (min_value / max_value)
  filtered = filtered.filter((ev) => {
    const cfg = entities.find((e) => e.entity === ev.id);
    return passesValueFilter(ev.raw_state, cfg);
  });

  // Sort (OLDEST first) to keep the earliest event when collapsing
  filtered = filtered.sort((a, b) => a.time - b.time);

  // NEW: collapse duplicates
  filtered = collapseDuplicates(filtered, entities, globalConfig);

  // Sort back to NEWEST first for display
  filtered = filtered.reverse();

  // Apply limit
  return filtered.slice(0, limit);
}
