// Helper to open a route in a new tab when middle-clicked or when modifier keys
// (Ctrl/Cmd) are used, otherwise use react-router's navigate.
export function openInNewTabOrNavigate(e, navigateFn, path) {
  // Allow callers to stop propagation before calling this helper if needed,
  // but also stop here to avoid parent handlers when navigating.
  if (e && e.stopPropagation) e.stopPropagation();

  const isModifier = e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);
  const isMiddle = e && (e.button === 1);

  if (isMiddle || isModifier) {
    // Construct absolute URL so the new tab has the same origin + path
    const url = window.location.origin + (path.startsWith('/') ? path : '/' + path);
    window.open(url, '_blank');
    return;
  }

  // Default: navigate in current tab
  navigateFn(path);
}

export default openInNewTabOrNavigate;
