import { initials } from '../lib/format.js';

const COLORS = ['#1F6B3A', '#C9850A', '#175230', '#7A4E2D', '#2A8049'];

export default function FarmerAvatar({ farmer, size = 48 }) {
  const name = farmer?.name || farmer?.farmName || '';
  if (farmer?.photo) {
    return <img src={farmer.photo} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  const color = COLORS[(name.charCodeAt(0) || 0) % COLORS.length];
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
