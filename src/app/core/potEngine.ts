export function evaluatePotResult(
    strictMode: boolean,
    potSpilled: boolean
): 'retained' | 'spilled' | null {
    if (!strictMode) return null;
    return potSpilled ? 'spilled' : 'retained';
}
