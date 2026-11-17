import { NavLink } from 'react-router';
import { TABS } from '../tabs';

export default function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ path, label, icon: Icon }) => (
        <NavLink key={path} to={path} end={path === '/'} className="tab">
          <Icon size={22} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
