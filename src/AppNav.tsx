import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Trade Simulator', end: true },
  { to: '/pnl-from-csv', label: 'PNL From CSV', end: false },
  { to: '/retirement', label: 'Retirement Calculator', end: false },
];

export default function AppNav() {
  return (
    <nav className="app-nav">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) => (isActive ? 'app-nav-link active' : 'app-nav-link')}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
