// Shared trades constant - used across Explore, Post Job, Job Details
export const TRADES = [
  { name: 'Electrician', icon: '⚡', color: '#FFC107' },
  { name: 'Plumber', icon: '🔧', color: '#2196F3' },
  { name: 'Handyman', icon: '🔨', color: '#795548' },
  { name: 'HVAC Technician', icon: '❄️', color: '#00BCD4' },
  { name: 'Carpenter', icon: '🪚', color: '#8D6E63' },
  { name: 'Painter', icon: '🎨', color: '#9C27B0' },
  { name: 'Roofer', icon: '🏠', color: '#607D8B' },
  { name: 'General Contractor', icon: '👷', color: '#FF9800' },
  { name: 'Tiler', icon: '🔲', color: '#3F51B5' },
  { name: 'Landscaper', icon: '🌳', color: '#4CAF50' },
  { name: 'Mason', icon: '🧱', color: '#BF360C' },
  { name: 'Welder', icon: '🔥', color: '#FF5722' },
  { name: 'Glazier', icon: '🪟', color: '#81D4FA' },
  { name: 'Demolition', icon: '💥', color: '#D32F2F' },
  { name: 'Drywall', icon: '🏗️', color: '#9E9E9E' },
  { name: 'Flooring', icon: '🪵', color: '#6D4C41' },
  { name: 'Insulation', icon: '🧤', color: '#E91E63' },
  { name: 'Concrete', icon: '🪨', color: '#757575' },
  { name: 'Fence', icon: '🚧', color: '#8BC34A' },
  { name: 'Deck Builder', icon: '🌲', color: '#33691E' },
  { name: 'Cabinet Maker', icon: '🪑', color: '#A1887F' },
  { name: 'Window Installer', icon: '🖼️', color: '#42A5F5' },
  { name: 'Siding', icon: '🏘️', color: '#78909C' },
  { name: 'Garage Door', icon: '🚗', color: '#546E7A' },
  { name: 'Pool Service', icon: '🏊', color: '#00ACC1' },
  { name: 'Locksmith', icon: '🔐', color: '#FFC107' },
  { name: 'Appliance Repair', icon: '🔌', color: '#673AB7' },
  { name: 'Moving', icon: '📦', color: '#FF7043' },
  { name: 'Cleaning', icon: '🧹', color: '#26A69A' },
  { name: 'Blinds & Curtains', icon: '🪟', color: '#7E57C2' },
];

// Get icon for a trade name
export const getTradeIcon = (tradeName: string): string => {
  const trade = TRADES.find(t => t.name.toLowerCase() === tradeName?.toLowerCase());
  return trade?.icon || '🔧';
};

// Get color for a trade name
export const getTradeColor = (tradeName: string): string => {
  const trade = TRADES.find(t => t.name.toLowerCase() === tradeName?.toLowerCase());
  return trade?.color || '#FF6A00';
};
