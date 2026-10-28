import { useState } from 'react';

export type WorkspaceMenuGroup = {
  id: string;
  label: string;
  count?: string;
  items: Array<{ id: string; label: string }>;
};

export function WorkspaceSidebar(props: {
  title: string;
  groups: WorkspaceMenuGroup[];
  activeItem: string;
  onSelect: (item: string) => void;
}) {
  const activeGroup = props.groups.find((group) => group.items.some((item) => item.id === props.activeItem))?.id;
  const [openGroup, setOpenGroup] = useState(activeGroup ?? props.groups[0]?.id ?? '');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <aside className={`workspace-sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}>
      <div className="workspace-sidebar-header">
        <div className="workspace-sidebar-brand">
          <span className="workspace-sidebar-mark" aria-hidden="true">V</span>
          <div><small>VirtualChallenge</small><strong>{props.title}</strong></div>
        </div>
        <button
          type="button"
          className="workspace-sidebar-toggle"
          aria-label={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          <span aria-hidden="true">{collapsed ? '›' : '‹'}</span>
        </button>
        <button
          type="button"
          className="workspace-sidebar-mobile-toggle"
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((value) => !value)}
        >
          <span aria-hidden="true">{mobileOpen ? '×' : '☰'}</span>
        </button>
      </div>
      <nav className="workspace-sidebar-nav" aria-label={`Menú ${props.title.toLowerCase()}`}>
        {props.groups.map((group, index) => {
          const isActive = group.id === activeGroup;
          const isOpen = openGroup === group.id && !collapsed;
          return (
            <div className="workspace-menu-group" key={group.id}>
              <button
                type="button"
                className={`workspace-menu-heading ${isActive ? 'is-active' : ''}`}
                aria-expanded={isOpen}
                aria-controls={`workspace-submenu-${group.id}`}
                aria-label={group.label}
                title={collapsed ? group.label : undefined}
                onClick={() => {
                  if (collapsed) { setCollapsed(false); setOpenGroup(group.id); }
                  else setOpenGroup((current) => current === group.id ? '' : group.id);
                }}
              >
                <span className="workspace-menu-icon" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <span className="workspace-menu-label">{group.label}</span>
                {group.count ? <span className="workspace-menu-count">{group.count}</span> : null}
                <span className="workspace-menu-chevron" aria-hidden="true">⌄</span>
              </button>
              <div id={`workspace-submenu-${group.id}`} className="workspace-submenu" hidden={!isOpen}>
                {group.items.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`workspace-submenu-item ${props.activeItem === item.id ? 'is-active' : ''}`}
                    aria-current={props.activeItem === item.id ? 'page' : undefined}
                    onClick={() => { props.onSelect(item.id); setMobileOpen(false); }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
