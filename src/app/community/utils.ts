/**
 * Generate a consistent random saturated color for each post based on its ID.
 * Colors are chosen to contrast well with dark backgrounds.
 */
export function getPostTitleColor(postId: string): string {
  // Saturated, vibrant colors that contrast well with dark backgrounds
  const vibrantColors = [
    '#67e8f9', // Cyan
    '#f472b6', // Pink
    '#fbbf24', // Amber/Yellow
    '#10b981', // Emerald/Green
    '#f97316', // Orange
    '#a855f7', // Purple
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#06b6d4', // Cyan-500
    '#ec4899', // Pink-500
    '#f59e0b', // Amber-500
    '#14b8a6', // Teal
    '#8b5cf6', // Violet
    '#6366f1', // Indigo
    '#22d3ee', // Sky
    '#fb7185', // Rose
    '#34d399', // Emerald-400
    '#fbbf24', // Amber-400
    '#60a5fa', // Blue-400
    '#a78bfa', // Violet-400
  ];

  // Simple hash function to convert postId to a number
  let hash = 0;
  for (let i = 0; i < postId.length; i++) {
    hash = postId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use absolute value and modulo to get index
  const index = Math.abs(hash) % vibrantColors.length;
  return vibrantColors[index];
}
