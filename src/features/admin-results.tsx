import type { PageMetadata, ProgramOption, AdminUser, AdminResultAttempt, AdminResultMetrics, AdminAttemptDetail, SearchOption, AppRole, AcademicSpace } from '../types';
import { ADMIN_PAGE_SIZE, EMPTY_PAGE } from '../types';
import { MetricCard, AdminRow } from '../components/shared';
import { getApiErrorMessage } from '../lib/errors';
import { formatAttemptStatus, getResultScoreValue } from '../lib/result-formatters';
import { ResultTextBlock } from './student';
import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

export function AdminResultsPanel() {
  const [filters, setFilters] = useState({
    programId: "",
    academicSpaceId: "",
    teacherUserId: "",
    studentUserId: "",
    dateFrom: "",
    dateTo: "",
  });
  const [results, setResults] = useState<AdminResultAttempt[]>([]);
  const [pagination, setPagination] = useState(EMPTY_PAGE);
  const [resultsPage, setResultsPage] = useState(1);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [metrics, setMetrics] = useState<AdminResultMetrics | null>(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState("");
  const [attemptDetail, setAttemptDetail] = useState<AdminAttemptDetail | null>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState("");
  const filtersRef = useRef(filters);
  const resultsPageRef = useRef(resultsPage);
  const isFirstFilterRender = useRef(true);
  filtersRef.current = filters;
  resultsPageRef.current = resultsPage;

  useEffect(() => {
    void loadResults();
    void api.get<{ programs: ProgramOption[] }>("/admin/programs/options")
      .then((response) => setPrograms(response.data.programs))
      .catch(() => setError("No fue posible cargar los programas."));
    const refreshTimer = window.setInterval(() => void loadResults(true, filtersRef.current, resultsPageRef.current), 30_000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  useEffect(() => {
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      setResultsPage(1);
      void loadResults(false, filters, 1);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [filters]);

  async function loadResults(isBackground = false, currentFilters = filters, page = resultsPage) {
    if (!isBackground) setIsLoadingResults(true);
    setError("");
    if (!isBackground) {
      setAttemptDetail(null);
      setSelectedAttemptId("");
    }

    const params = buildAdminResultParams(currentFilters);
    params.set("page", String(page));
    params.set("pageSize", String(ADMIN_PAGE_SIZE));

    try {
      const [resultsResponse, metricsResponse] = await Promise.all([
        api.get<{ results: AdminResultAttempt[]; pagination: PageMetadata }>(
          `/admin/results${params.size ? `?${params.toString()}` : ""}`,
        ),
        api.get<{ metrics: AdminResultMetrics }>(
          `/admin/results/metrics${params.size ? `?${params.toString()}` : ""}`,
        ),
      ]);
      setResults(resultsResponse.data.results);
      setPagination(resultsResponse.data.pagination);
      setResultsPage(resultsResponse.data.pagination.page);
      setMetrics(metricsResponse.data.metrics);
    } catch (unknownError) {
      setError(getApiErrorMessage(unknownError));
    } finally {
      if (!isBackground) setIsLoadingResults(false);
    }
  }

  async function exportResults(format: "csv" | "xlsx") {
    setError("");
    const params = buildAdminResultParams(filters);
    const mimeType = format === "csv"
      ? "text/csv"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    try {
      const response = await api.get<Blob>(
        `/admin/results/export.${format}${params.size ? `?${params.toString()}` : ""}`,
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(new Blob([response.data], { type: mimeType }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `resultados-virtualchallenge-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (unknownError) {
      setError(getApiErrorMessage(unknownError));
    }
  }

  async function loadAttemptDetail(attemptId: string) {
    setSelectedAttemptId(attemptId);
    setAttemptDetail(null);
    setError("");
    setIsLoadingDetail(true);

    try {
      const response = await api.get<{ attempt: AdminAttemptDetail }>(`/admin/attempts/${attemptId}`);
      setAttemptDetail(response.data.attempt);
    } catch (unknownError) {
      setError(getApiErrorMessage(unknownError));
    } finally {
      setIsLoadingDetail(false);
    }
  }

  function updateFilter<K extends keyof typeof filters>(key: K, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "programId" ? { academicSpaceId: "" } : {}),
    }));
  }

  return (
    <section className="content-stack admin-results-workspace">
      <div className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Histórico</p>
            <h2>Resultados globales</h2>
          </div>
        </div>
        <form className="filter-grid" onSubmit={(event) => event.preventDefault()}>
          <label>
            Programa
            <select value={filters.programId} onChange={(event) => updateFilter("programId", event.target.value)}>
              <option value="">Todos</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>{program.name}</option>
              ))}
            </select>
          </label>
          <AdminSpacePicker value={filters.academicSpaceId} programId={filters.programId} onChange={(value) => updateFilter("academicSpaceId", value)} />
          <AdminUserPicker role="docente" value={filters.teacherUserId} onChange={(value) => updateFilter("teacherUserId", value)} />
          <AdminUserPicker role="estudiante" value={filters.studentUserId} onChange={(value) => updateFilter("studentUserId", value)} />
          <label>
            Desde
            <input type="date" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} />
          </label>
          <label>
            Hasta
            <input type="date" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} />
          </label>
          <div className="inline-form filter-actions">
            <button type="button" className="secondary-button" onClick={() => void exportResults("csv")}>
              Exportar CSV
            </button>
            <button type="button" className="secondary-button" onClick={() => void exportResults("xlsx")}>
              Exportar XLSX
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setFilters({
                  programId: "",
                  academicSpaceId: "",
                  teacherUserId: "",
                  studentUserId: "",
                  dateFrom: "",
                  dateTo: "",
                });
              }}
            >
              Limpiar
            </button>
          </div>
        </form>
      </div>

      {metrics ? <AdminResultMetricsPanel metrics={metrics} /> : null}

      <section className="results-grid admin-results-grid">
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Intentos</p>
              <h2>Resultados encontrados</h2>
            </div>
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          {isLoadingResults ? <p>Cargando resultados...</p> : null}
          {!isLoadingResults ? (
            <div className="table-like">
              {results.length === 0 ? (
                <div className="admin-row">
                  <div>
                    <strong>No hay resultados</strong>
                    <span>Ajusta los filtros o espera a que existan intentos evaluados.</span>
                  </div>
                </div>
              ) : null}
              {results.map((result) => (
                <AdminRow
                  key={result.id}
                  label={`${result.studentName} · ${result.liveTalkTitle}`}
                  value={`${result.programName} · ${result.academicSpaceName} · Docente: ${result.teacherName}`}
                  status={selectedAttemptId === result.id ? "Seleccionado" : formatAttemptStatus(result.status)}
                  actions={[
                    { label: "Ver detalle", onClick: () => void loadAttemptDetail(result.id) },
                  ]}
                />
              ))}
            </div>
          ) : null}
          <TablePagination pagination={pagination} isLoading={isLoadingResults} onPageChange={(page) => { setResultsPage(page); void loadResults(false, filters, page); }} />
        </div>

        <AdminAttemptResultPanel
          detail={attemptDetail}
          isLoading={isLoadingDetail}
        />
      </section>
    </section>
  );
}

function AdminResultMetricsPanel(props: {
  metrics: AdminResultMetrics;
}) {
  return (
    <div className="content-stack">
      <section className="metric-grid compact-metrics">
        <MetricCard label="Intentos" value={String(props.metrics.totalAttempts)} detail="Total filtrado" />
        <MetricCard label="Completados" value={String(props.metrics.completedAttempts)} detail="Conversaciones cerradas" />
        <MetricCard
          label="Promedio"
          value={props.metrics.averageScore === null ? "-" : String(props.metrics.averageScore)}
          detail="Nota efectiva"
        />
        <MetricCard label="Revisados" value={String(props.metrics.reviewedAttempts)} detail="Revisión docente" />
      </section>

      <section className="admin-grid admin-metric-breakdown">
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Programas</p>
              <h2>Resumen por programa</h2>
            </div>
          </div>
          <AdminMetricGroupList groups={props.metrics.byProgram} />
        </div>
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Espacios</p>
              <h2>Resumen por espacio</h2>
            </div>
          </div>
          <AdminMetricGroupList groups={props.metrics.bySpace} />
        </div>
      </section>
    </div>
  );
}

function AdminMetricGroupList(props: {
  groups: AdminResultMetrics["byProgram"];
}) {
  if (props.groups.length === 0) {
    return <p className="muted">No hay datos para los filtros seleccionados.</p>;
  }

  return (
    <div className="table-like">
      {props.groups.map((group) => (
        <div className="admin-row" key={group.id}>
          <div>
            <strong>{group.name}</strong>
            <span>{group.attemptsCount} intentos</span>
          </div>
          <div className="row-actions">
            <em>Promedio {group.averageScore ?? "-"}</em>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminAttemptResultPanel(props: {
  detail: AdminAttemptDetail | null;
  isLoading: boolean;
}) {
  if (props.isLoading) {
    return <section className="panel"><p>Cargando detalle...</p></section>;
  }

  if (!props.detail) {
    return (
      <section className="panel empty-state">
        <p className="eyebrow">Detalle global</p>
        <h2>Selecciona un intento</h2>
        <p className="muted">Aquí verás nota, revisión docente, rúbrica, evidencia, retroalimentación y transcripción.</p>
      </section>
    );
  }

  return (
    <section className="panel result-detail">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Intento</p>
          <h2>{props.detail.studentName}</h2>
          <p className="muted">
            {props.detail.liveTalkTitle} · {props.detail.academicSpaceName} · Docente: {props.detail.teacherName}
          </p>
        </div>
        <div className="score-badge">
          <span>Nota</span>
          <strong>{getResultScoreValue(props.detail)}</strong>
        </div>
      </div>

      <div className="result-section">
        <h3>Contexto</h3>
        <p className="muted">
          {props.detail.programName} · {formatAttemptStatus(props.detail.status)} · Revisión docente: {props.detail.teacherReviewed ? "Sí" : "No"}
        </p>
        {props.detail.evaluationStatus === "failed" && props.detail.evaluationError ? (
          <p className="error-text">{props.detail.evaluationError}</p>
        ) : null}
        {props.detail.teacherOverrideReason ? <p>{props.detail.teacherOverrideReason}</p> : null}
      </div>

      {props.detail.feedback ? (
        <div className="result-section">
          <h3>Retroalimentación</h3>
          <p>{props.detail.feedback.summary}</p>
          <ResultTextBlock title="Fortalezas" text={props.detail.feedback.strengths} />
          <ResultTextBlock title="Aspectos por fortalecer" text={props.detail.feedback.improvementOpportunities} />
          <ResultTextBlock title="Recomendaciones" text={props.detail.feedback.recommendations} />
        </div>
      ) : null}

      <div className="result-section">
        <h3>Rúbrica por temática</h3>
        <div className="rubric-list">
          {props.detail.rubricItems.length === 0 ? <p className="muted">La rúbrica aún no está disponible.</p> : null}
          {props.detail.rubricItems.map((item) => (
            <article className="rubric-item" key={item.id}>
              <div className="rubric-header">
                <strong>{item.topic ?? "Tema evaluado"}</strong>
                <span>{item.score}/{item.maxScore}</span>
              </div>
              <p className="muted">{item.performanceLevel}</p>
              <p>{item.justification}</p>
              <div className="evidence-list">
                {item.evidence.length === 0 ? <span>Sin evidencia citada.</span> : null}
                {item.evidence.map((evidence) => (
                  <blockquote key={`${item.id}-${evidence.turn_id}-${evidence.fragment}`}>
                    <strong>T{evidence.turn_id}</strong> {evidence.fragment}
                  </blockquote>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="result-section">
        <h3>Transcripción normalizada</h3>
        <div className="transcript-list">
          {props.detail.transcript.length === 0 ? (
            <p className="muted">No hay transcripción registrada para este intento.</p>
          ) : null}
          {props.detail.transcript.map((turn) => (
            <article key={turn.turnId} className="transcript-turn">
              <span>T{turn.turnId} · {turn.speaker === "student" ? "Estudiante" : "Evaluador"}</span>
              <p>{turn.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function buildAdminResultParams(filters: {
  programId: string;
  academicSpaceId: string;
  teacherUserId: string;
  studentUserId: string;
  dateFrom: string;
  dateTo: string;
}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params;
}

export function AdminUserPicker(props: {
  role: AppRole | "all";
  value: string;
  selectedLabel?: string;
  onChange: (value: string) => void;
}) {
  return (
    <RemoteAdminPicker
      label={props.role === "docente" ? "Docente" : props.role === "estudiante" ? "Estudiante" : "Usuario"}
      placeholder="Nombre, cédula o correo"
      value={props.value}
      selectedLabel={props.selectedLabel}
      onChange={props.onChange}
      loadOptions={async (search) => {
        const response = await api.get<{ users: AdminUser[] }>("/admin/users", {
          params: { role: props.role === "all" ? undefined : props.role, search, pageSize: 10 },
        });
        return response.data.users.map((user) => ({ id: user.id, label: `${user.name} · ${user.email}` }));
      }}
    />
  );
}

export function AdminSpacePicker(props: {
  value: string;
  selectedLabel?: string;
  onChange: (value: string) => void;
  programId?: string;
}) {
  return (
    <RemoteAdminPicker
      label="Espacio académico"
      placeholder="Buscar espacio"
      value={props.value}
      selectedLabel={props.selectedLabel}
      onChange={props.onChange}
      programId={props.programId}
      loadOptions={async (search) => {
        const response = await api.get<{ academicSpaces: AcademicSpace[] }>("/admin/academic-spaces", {
          params: { search, programId: props.programId || undefined, pageSize: 10 },
        });
        return response.data.academicSpaces.map((space) => ({ id: space.id, label: space.name }));
      }}
    />
  );
}

function RemoteAdminPicker(props: {
  label: string;
  placeholder: string;
  value: string;
  selectedLabel?: string;
  onChange: (value: string) => void;
  loadOptions: (search: string) => Promise<SearchOption[]>;
  programId?: string;
}) {
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<SearchOption[]>([]);
  const [selected, setSelected] = useState<SearchOption | null>(() => props.value && props.selectedLabel
    ? { id: props.value, label: props.selectedLabel }
    : null);
  const [loading, setLoading] = useState(false);
  const loadRef = useRef(props.loadOptions);

  useEffect(() => {
    loadRef.current = props.loadOptions;
  }, [props.loadOptions]);

  useEffect(() => {
    if (props.value !== selected?.id) {
      setSelected(options.find((option) => option.id === props.value) ?? null);
    }
  }, [props.value, selected?.id, options]);

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) {
      return;
    }
    const timer = window.setTimeout(() => {
      setLoading(true);
      void loadRef.current(term)
        .then(setOptions)
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, props.programId]);

  return (
    <label className="remote-picker">
      {props.label}
      <input
        value={selected && props.value ? selected.label : search}
        placeholder={props.placeholder}
        onChange={(event) => {
          const value = event.target.value;
          setSelected(null);
          setSearch(value);
          if (props.value) props.onChange("");
        }}
      />
      {loading ? <small>Buscando...</small> : null}
      {!loading && search.trim().length >= 2 ? (
        <select
          aria-label={`Resultados de ${props.label.toLowerCase()}`}
          size={Math.min(Math.max(options.length, 2), 5)}
          value={props.value}
          onChange={(event) => {
            const option = options.find((item) => item.id === event.target.value) ?? null;
            setSelected(option);
            setSearch("");
            props.onChange(option?.id ?? "");
          }}
        >
          <option value="">{options.length ? "Selecciona un resultado" : "Sin coincidencias"}</option>
          {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      ) : null}
    </label>
  );
}

function TablePagination(props: {
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

