export function scrollToValidationField(path: string | null): void {
  if (!path) return;

  const container = document.querySelector(`[data-field="${path}"]`);
  if (container) {
    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const focusable = container.querySelector<HTMLElement>(
      'input:not([type="hidden"]), select, textarea, button.hardness-btn',
    );
    if (focusable) {
      focusable.focus({ preventScroll: true });
    }
    return;
  }

  if (path.startsWith('activity.')) {
    const activityId = path.split('.')[1];
    const card = document.getElementById(`activity-${activityId}`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  if (path.startsWith('roster.')) {
    const equipmentId = path.split('.')[1];
    const card = document.getElementById(`roster-${equipmentId}`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
