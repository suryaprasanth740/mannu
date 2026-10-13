import { NavLink, Outlet } from 'react-router-dom';

/** Sidebar on desktop, bottom tab bar on phones. `links` = [{ to, label, icon, end }] */
export default function DashboardShell({ title, links, banner }) {
  return (
    <div className="container-page grid gap-8 py-6 pb-28 lg:grid-cols-[220px_1fr] lg:pb-10">
      <aside className="hidden lg:block">
        <div className="sticky top-36">
          <p className="mb-3 px-3 text-sm font-bold text-soil-500">{title}</p>
          <nav className="space-y-1">
            {links.map(({ to, label, icon: Icon, end, badge }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold ${isActive ? 'bg-leaf-700 text-white' : 'text-soil-700 hover:bg-leaf-50'}`
                }
              >
                <Icon size={19} /> <span className="flex-1">{label}</span>
                {badge > 0 && <span className="rounded-full bg-turmeric-500 px-2 text-xs font-bold text-leaf-950">{badge}</span>}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
      <div className="min-w-0">
        {banner}
        <Outlet />
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-white lg:hidden" style={{ gridTemplateColumns: `repeat(${Math.min(links.length, 5)}, 1fr)` }}>
        {links.slice(0, 5).map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive ? 'text-leaf-700' : 'text-soil-500'}`}
          >
            <Icon size={22} />
            <span className="max-w-full truncate px-1">{label}</span>
            {badge > 0 && <span className="absolute top-1.5 left-1/2 ml-2 rounded-full bg-turmeric-500 px-1.5 text-[10px] font-bold text-leaf-950">{badge}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
