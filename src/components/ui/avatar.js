// utils/avatar.js
export const getAvatarInitials = (name = '') => {
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    
    return initials;
  };
  
  export const getAvatarColor = (name = '') => {
    const colors = [
      'bg-indigo-500', 'bg-blue-500', 'bg-green-500', 
      'bg-yellow-500', 'bg-red-500', 'bg-purple-500',
      'bg-pink-500', 'bg-orange-500'
    ];
    
    // Simple hash to get consistent color for same name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };