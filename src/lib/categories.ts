export type ServiceCategory = {
  trade: string;
  label: string;
  icon: string;
  blurb: string;
};

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { trade: 'plumber', label: 'Plumbing', icon: 'WrenchScrewdriverIcon', blurb: 'Leaks, drains, and pipe fixes' },
  { trade: 'electrician', label: 'Electrical', icon: 'BoltIcon', blurb: 'Outlets, fixtures, and wiring' },
  { trade: 'carpenter', label: 'Carpentry', icon: 'HomeModernIcon', blurb: 'Doors, shelves, and woodwork' },
  { trade: 'painter', label: 'Painting', icon: 'PaintBrushIcon', blurb: 'Rooms, trim, and touch-ups' },
  { trade: 'cleaner', label: 'Cleaning', icon: 'SparklesIcon', blurb: 'Deep cleans and home refresh' },
  { trade: 'ac', label: 'AC repair', icon: 'CpuChipIcon', blurb: 'AC install, service, and repair' },
  { trade: 'dressmaking', label: 'Dressmaking', icon: 'ScissorsIcon', blurb: 'Custom dresses, kaba and slit, alterations' },
  { trade: 'fashion design', label: 'Fashion design', icon: 'SwatchIcon', blurb: 'Bespoke outfits and styling' },
  { trade: 'tailoring', label: 'Tailoring', icon: 'ScissorsIcon', blurb: 'Suits, shirts, and fittings' },
  { trade: 'hair making', label: 'Hair making', icon: 'FaceSmileIcon', blurb: 'Braids, weaves, and styling' },
  { trade: 'barbering', label: 'Barbering', icon: 'UserIcon', blurb: 'Haircuts, shaves, and grooming' },
  { trade: 'makeup', label: 'Makeup', icon: 'HeartIcon', blurb: 'Bridal, events, and photoshoots' },
  { trade: 'nail care', label: 'Nail care', icon: 'HandRaisedIcon', blurb: 'Manicures, pedicures, and nail art' },
  { trade: 'catering', label: 'Catering', icon: 'CakeIcon', blurb: 'Events, parties, and home meals' },
  { trade: 'photography', label: 'Photography', icon: 'CameraIcon', blurb: 'Events, portraits, and products' },
  { trade: 'laundry', label: 'Laundry', icon: 'ShoppingBagIcon', blurb: 'Washing, ironing, and dry cleaning' },
];

export function findCategory(trade: string | null | undefined) {
  if (!trade) return undefined;
  const key = trade.trim().toLowerCase();
  return SERVICE_CATEGORIES.find((c) => c.trade === key || c.label.toLowerCase() === key);
}

export function categoryLabel(trade: string | null | undefined) {
  if (!trade) return '';
  return findCategory(trade)?.label || trade.charAt(0).toUpperCase() + trade.slice(1);
}

export function categoryIcon(trade: string | null | undefined) {
  return findCategory(trade)?.icon || 'WrenchIcon';
}
