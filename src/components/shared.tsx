import type { ReactNode } from 'react';
import type { PageMetadata } from '../types';

export function TablePagination(props: {
  pagination: PageMetadata;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
}) {
  const { page, totalPages, totalItems, pageSize } = props.pagination;
  if (totalItems === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalItems);
  return (
    <nav className="table-pagination" aria-label="Paginación de resultados">
      <span>{first}-{last} de {totalItems}</span>
      <div>
        <button type="button" className="secondary-button" disabled={page <= 1 || props.isLoading} onClick={() => props.onPageChange(page - 1)}>Anterior</button>
        <span>Página {page} de {totalPages}</span>
        <button type="button" className="secondary-button" disabled={page >= totalPages || props.isLoading} onClick={() => props.onPageChange(page + 1)}>Siguiente</button>
      </div>
    </nav>
  );
}

export function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

export function EyeOffIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m3 3 18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6.1 0 9.5 6 9.5 6a15 15 0 0 1-3.1 3.7M6.2 6.3C3.8 8 2.5 12 2.5 12s3.4 6 9.5 6a10 10 0 0 0 3.1-.5" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}


export function MetricCard(props: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="metric-card">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
      <p>{props.detail}</p>
    </article>
  );
}

export function AdminRow(props: {
  label: string;
  value: string;
  status: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
  }>;
}) {
  return (
    <div className="admin-row">
      <div>
        <strong>{props.label}</strong>
        <span>{props.value}</span>
      </div>
      <div className="row-actions">
        <em>{props.status}</em>
        {props.actions?.map((action) => (
          <button
            key={action.label}
            type="button"
            className="secondary-button"
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export type TableAction = {
  label: string;
  icon?: "edit" | "enable" | "disable" | "delete" | "remove" | "key" | "copy";
  onClick: () => void;
};
export type TableColumn<T> = { label: string; render: (row: T) => ReactNode };

export function DataTable<T extends { id: string }>(props: {
  rows: T[];
  columns: TableColumn<T>[];
  actions: (row: T) => TableAction[];
  emptyMessage: string;
  compact?: boolean;
  pagination?: PageMetadata;
  isLoading?: boolean;
  onPageChange?: (page: number) => void;
}) {
  return (
    <div className="data-table-wrap">
      {props.isLoading ? <p className="table-loading" role="status">Actualizando...</p> : null}
      <table className={`data-table ${props.compact ? "compact" : ""}`}>
        <thead>
          <tr>
            {props.columns.map((column) => <th key={column.label} scope="col">{column.label}</th>)}
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {props.rows.length === 0 ? (
            <tr><td className="table-empty" colSpan={props.columns.length + 1}>{props.emptyMessage}</td></tr>
          ) : props.rows.map((row) => (
            <tr key={row.id}>
              {props.columns.map((column) => <td key={column.label}>{column.render(row)}</td>)}
              <td>
                <div className="row-actions">
                  {props.actions(row).map((action) => (
                    <button
                      className="table-icon-action"
                      key={action.label}
                      type="button"
                      title={action.label}
                      aria-label={action.label}
                      onClick={action.onClick}
                    >
                      <ActionIcon name={action.icon ?? "edit"} />
                    </button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {props.pagination && props.onPageChange ? (
        <TablePagination pagination={props.pagination} isLoading={props.isLoading} onPageChange={props.onPageChange} />
      ) : null}
    </div>
  );
}

export function ActionIcon(props: { name: NonNullable<TableAction["icon"]> }) {
  const iconPaths = {
    edit: <><path d="m4 16.5-.8 4.3 4.3-.8L19 8.5 15.5 5 4 16.5Z" /><path d="m13.8 6.7 3.5 3.5" /></>,
    enable: <><path d="M12 3v9" /><path d="M7 5.8a8 8 0 1 0 10 0" /></>,
    disable: <><path d="M12 3v9" /><path d="M7 5.8a8 8 0 1 0 10 0" /></>,
    delete: <><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="m5 7 1 14h12l1-14M9 7V4h6v3" /></>,
    remove: <><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="m5 7 1 14h12l1-14" /></>,
    key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9m-5 5 3 3m-6-1 3 3" /></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="1" /><path d="M16 8V4H4v12h4" /></>,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {iconPaths[props.name]}
      {props.name === "disable" ? <path d="m5 5 14 14" /> : null}
    </svg>
  );
}

export function StatusPill(props: { active: boolean }) {
  return <span className={`status-pill ${props.active ? "is-active" : ""}`}>{props.active ? "Activo" : "Inactivo"}</span>;
}

export function ModalDialog(props: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) props.onClose();
    }}>
      <section className="admin-form-dialog" role="dialog" aria-modal="true" aria-label={props.title}>
        <div className="section-heading">
          <h2>{props.title}</h2>
          <button className="secondary-button" type="button" onClick={props.onClose}>Cerrar</button>
        </div>
        {props.children}
      </section>
    </div>
  );
}


