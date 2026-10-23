export function hasAllocatedPanelSlots(
  packages: Array<{ slotBudget?: number | null }>
): boolean {
  return packages.some((pkg) => {
    const slots = pkg.slotBudget;
    return typeof slots === "number" && Number.isFinite(slots) && slots >= 1;
  });
}
