
export function getPostTitleColor(postId: string): string {
  
  const vibrantColors = [
    '#67e8f9', 
    '#f472b6', 
    '#fbbf24', 
    '#10b981', 
    '#f97316', 
    '#a855f7', 
    '#3b82f6', 
    '#ef4444', 
    '#06b6d4', 
    '#ec4899', 
    '#f59e0b', 
    '#14b8a6', 
    '#8b5cf6', 
    '#6366f1', 
    '#22d3ee', 
    '#fb7185', 
    '#34d399', 
    '#fbbf24', 
    '#60a5fa', 
    '#a78bfa', 
  ];

  let hash = 0;
  for (let i = 0; i < postId.length; i++) {
    hash = postId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % vibrantColors.length;
  return vibrantColors[index];
}
