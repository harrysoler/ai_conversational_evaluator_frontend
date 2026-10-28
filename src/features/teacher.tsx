import type { AppUser, ConfirmationState, TeacherAcademicSpace, LiveTalkStatus, TeacherLiveTalk, TeacherResultAttempt, TeacherAttemptDetail } from '../types';
import { AdminRow } from '../components/shared';
import { WorkspaceSidebar, type WorkspaceMenuGroup } from '../components/workspace-sidebar';
import { getApiErrorMessage } from '../lib/errors';
import { formatAttemptStatus, getResultScoreLabel, getResultScoreValue } from '../lib/result-formatters';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { ConfirmDialog } from './admin-catalog';
import { ResultTextBlock } from './student';
import tutorImage from '../assets/virtualchallenge-tutor.png';

export function TeacherHome(props: {
  user: AppUser | null;
}) {
  const [activeItem, setActiveItem] = useState('live-talks.list');
  const [newTalkRequest, setNewTalkRequest] = useState(0);
  const [spaces, setSpaces] = useState<TeacherAcademicSpace[]>([]);
  const [liveTalks, setLiveTalks] = useState<TeacherLiveTalk[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null);

  async function loadTeacherData() {
    setError("");

    try {
      const [spacesResponse, liveTalksResponse] = await Promise.all([
        api.get<{ academicSpaces: TeacherAcademicSpace[] }>("/teacher/academic-spaces"),
        api.get<{ liveTalks: TeacherLiveTalk[] }>("/teacher/live-talks"),
      ]);

      setSpaces(spacesResponse.data.academicSpaces);
      setLiveTalks(liveTalksResponse.data.liveTalks);
    } catch {
      setError("No fue posible cargar la información docente.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTeacherData();
    const refreshTimer = window.setInterval(() => void loadTeacherData(), 30_000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  const menuGroups: WorkspaceMenuGroup[] = [
    { id: 'live-talks', label: 'Live Talks', count: String(liveTalks.length), items: [
      { id: 'live-talks.list', label: 'Listar Live Talks' }, { id: 'live-talks.create', label: 'Crear Live Talk' },
    ] },
    { id: 'resultados', label: 'Resultados', items: [{ id: 'resultados.history', label: 'Histórico de resultados' }] },
  ];

  function selectItem(item: string) {
    if (item === 'live-talks.create') setNewTalkRequest((request) => request + 1);
    setActiveItem(item);
  }

  return (
    <section className="role-workspace">
      <div className="workspace-layout">
        <WorkspaceSidebar title="Docente" groups={menuGroups} activeItem={activeItem} onSelect={selectItem} />
        <div className="workspace-main">
          <section className="workspace-hero teacher-hero">
            <div className="hero-copy">
              <p className="eyebrow">Docente</p>
              <h1>{props.user?.name ?? "Panel docente"}</h1>
              <p>Diseña evaluaciones conversacionales, activa sesiones para tus espacios y revisa evidencia con trazabilidad.</p>
            </div>
            <div className="hero-media"><img src={tutorImage} alt="" /></div>
            <div className="hero-badge"><span>Espacios</span><strong>{spaces.length}</strong></div>
          </section>
          <div className="workspace-content-heading"><p className="eyebrow">Docente</p><h2>{activeItem === 'live-talks.create' ? 'Crear Live Talk' : activeItem === 'live-talks.list' ? 'Live Talks' : 'Resultados'}</h2></div>
      {error ? <p className="error-text">{error}</p> : null}
      {isLoading ? <section className="panel"><p>Cargando datos docente...</p></section> : null}
      {!isLoading && activeItem.startsWith('live-talks.') ? (
        <TeacherLiveTalkPanel
          key={newTalkRequest}
          spaces={spaces}
          liveTalks={liveTalks}
          onChanged={loadTeacherData}
          confirm={setConfirmation}
          showError={setError}
          view={activeItem === 'live-talks.create' ? 'create' : 'list'}
          onViewChange={(view) => setActiveItem(`live-talks.${view}`)}
        />
      ) : null}
      {!isLoading && activeItem === 'resultados.history' ? (
        <TeacherResultsPanel liveTalks={liveTalks} />
      ) : null}
        </div>
      </div>

      {confirmation ? (
        <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
      ) : null}
    </section>
  );
}

function TeacherLiveTalkPanel(props: {
  spaces: TeacherAcademicSpace[];
  liveTalks: TeacherLiveTalk[];
  onChanged: () => Promise<void>;
  confirm: (confirmation: ConfirmationState) => void;
  showError: (message: string) => void;
  view: 'list' | 'create';
  onViewChange: (view: 'list' | 'create') => void;
}) {
  const firstSpaceId = props.spaces[0]?.id ?? "";
  const [editingLiveTalkId, setEditingLiveTalkId] = useState<string | null>(null);
  const [topicInput, setTopicInput] = useState("");
  const [form, setForm] = useState({
    academicSpaceId: firstSpaceId,
    title: "",
    generalTopic: "",
    topics: [] as string[],
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!form.academicSpaceId && firstSpaceId) {
      setForm((current) => ({ ...current, academicSpaceId: firstSpaceId }));
    }
  }, [firstSpaceId, form.academicSpaceId]);

  function resetForm() {
    setEditingLiveTalkId(null);
    setTopicInput("");
    setForm({
      academicSpaceId: firstSpaceId,
      title: "",
      generalTopic: "",
      topics: [],
    });
  }

  function editLiveTalk(liveTalk: TeacherLiveTalk) {
    setEditingLiveTalkId(liveTalk.id);
    setForm({
      academicSpaceId: liveTalk.academicSpaceId,
      title: liveTalk.title,
      generalTopic: liveTalk.generalTopic,
      topics: liveTalk.topics,
    });
    props.onViewChange('create');
  }

  function addTopic() {
    const normalizedTopic = topicInput.trim();

    if (!normalizedTopic) {
      return;
    }

    setForm({ ...form, topics: [...form.topics, normalizedTopic] });
    setTopicInput("");
  }

  function removeTopic(topicIndex: number) {
    setForm({
      ...form,
      topics: form.topics.filter((_, index) => index !== topicIndex),
    });
  }

  async function saveLiveTalk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (form.topics.length === 0) {
      setError("Agrega al menos una temática específica.");
      return;
    }

    try {
      if (editingLiveTalkId) {
        await api.patch(`/teacher/live-talks/${editingLiveTalkId}`, form);
      } else {
        await api.post("/teacher/live-talks", form);
      }

      resetForm();
      props.onViewChange('list');
      await props.onChanged();
    } catch (unknownError) {
      setError(getApiErrorMessage(unknownError));
    }
  }

  async function changeStatus(liveTalk: TeacherLiveTalk, status: LiveTalkStatus) {
    props.confirm({
      title: status === "active" ? "Activar live talk" : "Cerrar live talk",
      message: `${liveTalk.title} pasará a estado ${status === "active" ? "activo" : "cerrado"}.`,
      confirmLabel: status === "active" ? "Activar" : "Cerrar",
      onConfirm: async () => {
        await api.patch(`/teacher/live-talks/${liveTalk.id}/status`, { status });
        await props.onChanged();
      },
    });
  }

  async function deleteLiveTalk(liveTalk: TeacherLiveTalk) {
    props.confirm({
      title: "Eliminar live talk",
      message: `Se eliminará ${liveTalk.title}. Solo es posible eliminar live talks en borrador.`,
      confirmLabel: "Eliminar",
      onConfirm: async () => {
        try {
          await api.delete(`/teacher/live-talks/${liveTalk.id}`);
          await props.onChanged();
        } catch (unknownError) {
          props.showError(getApiErrorMessage(unknownError));
        }
      },
    });
  }

  return (
    <section className="admin-grid teacher-live-talk-panel">
      {props.view === 'list' ? <div className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Live Talks</p>
            <h2>Evaluaciones conversacionales</h2>
          </div>
        </div>

        <div className="table-like">
          {props.liveTalks.length === 0 ? (
            <div className="admin-row">
              <div>
                <strong>No hay live talks creados</strong>
                <span>Crea el primero desde el formulario.</span>
              </div>
            </div>
          ) : null}
          {props.liveTalks.map((liveTalk) => (
            <AdminRow
              key={liveTalk.id}
              label={`${liveTalk.title} · ${liveTalk.academicSpaceName}`}
              value={`${liveTalk.generalTopic} · ${liveTalk.topics.length} temáticas`}
              status={formatLiveTalkStatus(liveTalk.status)}
              actions={[
                ...(liveTalk.status === "draft"
                  ? [
                    { label: "Editar", onClick: () => editLiveTalk(liveTalk) },
                    { label: "Activar", onClick: () => void changeStatus(liveTalk, "active") },
                    { label: "Eliminar", onClick: () => void deleteLiveTalk(liveTalk) },
                  ]
                  : []),
                ...(liveTalk.status === "active"
                  ? [{ label: "Cerrar", onClick: () => void changeStatus(liveTalk, "closed") }]
                  : []),
              ]}
            />
          ))}
        </div>
      </div> : null}

      {props.view === 'create' ? <div className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Configuración</p>
            <h2>{editingLiveTalkId ? "Editar live talk" : "Crear live talk"}</h2>
          </div>
        </div>
        <form className="form-stack" onSubmit={saveLiveTalk}>
          <label>
            Espacio académico
            <select
              value={form.academicSpaceId}
              onChange={(event) => setForm({ ...form, academicSpaceId: event.target.value })}
              required
            >
              {props.spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name} · {space.programName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Título
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </label>
          <label>
            Tema general
            <input value={form.generalTopic} onChange={(event) => setForm({ ...form, generalTopic: event.target.value })} required />
          </label>
          <div className="inline-form">
            <input
              value={topicInput}
              onChange={(event) => setTopicInput(event.target.value)}
              placeholder="Temática específica"
            />
            <button type="button" onClick={addTopic}>Agregar</button>
          </div>
          <div className="topic-chips">
            {form.topics.map((topic, index) => (
              <button key={`${topic}-${index}`} type="button" onClick={() => removeTopic(index)}>
                {topic} x
              </button>
            ))}
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <div className="inline-form">
            <button type="submit" disabled={props.spaces.length === 0}>
              {editingLiveTalkId ? "Guardar live talk" : "Crear live talk"}
            </button>
            {editingLiveTalkId ? <button type="button" className="secondary-button" onClick={() => { resetForm(); props.onViewChange('list'); }}>Cancelar</button> : null}
          </div>
        </form>
      </div> : null}
    </section>
  );
}

function TeacherResultsPanel(props: {
  liveTalks: TeacherLiveTalk[];
}) {
  const [selectedLiveTalkId, setSelectedLiveTalkId] = useState(props.liveTalks[0]?.id ?? "");
  const [results, setResults] = useState<TeacherResultAttempt[]>([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState("");
  const [attemptDetail, setAttemptDetail] = useState<TeacherAttemptDetail | null>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState("");
  const talksBySpace = Array.from(
    props.liveTalks.reduce((groups, liveTalk) => {
      const current = groups.get(liveTalk.academicSpaceName) ?? [];
      current.push(liveTalk);
      groups.set(liveTalk.academicSpaceName, current);
      return groups;
    }, new Map<string, TeacherLiveTalk[]>()),
  );

  useEffect(() => {
    if (!selectedLiveTalkId && props.liveTalks[0]?.id) {
      setSelectedLiveTalkId(props.liveTalks[0].id);
    }
  }, [props.liveTalks, selectedLiveTalkId]);

  useEffect(() => {
    if (!selectedLiveTalkId) {
      setResults([]);
      return;
    }

    let isMounted = true;

    async function loadResults() {
      setIsLoadingResults(true);
      setError("");
      setResults([]);
      setAttemptDetail(null);
      setSelectedAttemptId("");

      try {
        const response = await api.get<{ results: TeacherResultAttempt[] }>(
          `/teacher/live-talks/${selectedLiveTalkId}/results`,
        );

        if (isMounted) {
          setResults(response.data.results);
        }
      } catch (unknownError) {
        if (isMounted) {
          setError(getApiErrorMessage(unknownError));
        }
      } finally {
        if (isMounted) {
          setIsLoadingResults(false);
        }
      }
    }

    void loadResults();
    const refreshTimer = window.setInterval(() => {
      void api.get<{ results: TeacherResultAttempt[] }>(`/teacher/live-talks/${selectedLiveTalkId}/results`)
        .then((response) => {
          if (isMounted) setResults(response.data.results);
        })
        .catch((unknownError) => {
          if (isMounted) setError(getApiErrorMessage(unknownError));
        });
    }, 30_000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
    };
  }, [selectedLiveTalkId]);

  async function loadAttemptDetail(attemptId: string) {
    setSelectedAttemptId(attemptId);
    setAttemptDetail(null);
    setError("");
    setIsLoadingDetail(true);

    try {
      const response = await api.get<{ attempt: TeacherAttemptDetail }>(`/teacher/attempts/${attemptId}`);
      setAttemptDetail(response.data.attempt);
    } catch (unknownError) {
      setError(getApiErrorMessage(unknownError));
    } finally {
      setIsLoadingDetail(false);
    }
  }

  return (
    <section className="results-grid teacher-results-grid" aria-label="Histórico de resultados">
      <div className="content-stack teacher-results-list">
        <div className="panel teacher-results-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Resultados</p>
              <h2>Live talks evaluados</h2>
            </div>
          </div>
          {props.liveTalks.length > 0 ? (
            <div className="teacher-space-tree" aria-label="Resultados por espacio académico">
              {talksBySpace.map(([spaceName, spaceTalks]) => (
                <details
                  className="teacher-space-node"
                  key={spaceName}
                  open={spaceTalks.some((liveTalk) => liveTalk.id === selectedLiveTalkId)}
                  onToggle={(event) => {
                    if (event.currentTarget.open && !spaceTalks.some((liveTalk) => liveTalk.id === selectedLiveTalkId)) {
                      setSelectedLiveTalkId(spaceTalks[0]?.id ?? "");
                    }
                  }}
                >
                  <summary className="teacher-space-node-label">
                    <strong>{spaceName}</strong><small>{spaceTalks.length} categorías</small>
                  </summary>
                  <div className="teacher-space-node-children">
                    {spaceTalks.map((liveTalk) => (
                      <details
                        className="teacher-live-talk-accordion"
                        key={liveTalk.id}
                        open={selectedLiveTalkId === liveTalk.id}
                        onToggle={(event) => {
                          if (event.currentTarget.open && selectedLiveTalkId !== liveTalk.id) {
                            setSelectedLiveTalkId(liveTalk.id);
                          }
                        }}
                      >
                        <summary>
                          <span className="teacher-result-tree-path">
                            <strong>{liveTalk.title}</strong>
                            <em>Resultados</em>
                          </span>
                          <span className="teacher-result-tree-meta">{liveTalk.generalTopic} · {liveTalk.topics.length} temáticas · {formatLiveTalkStatus(liveTalk.status)}</span>
                        </summary>
                        {selectedLiveTalkId === liveTalk.id ? (
                          <div className="teacher-accordion-results">
                            {error ? <p className="error-text">{error}</p> : null}
                            {isLoadingResults ? <p className="muted">Cargando resultados...</p> : null}
                            {!isLoadingResults && results.length === 0 ? <p className="muted">No hay intentos registrados.</p> : null}
                            {!isLoadingResults ? results.map((result) => (
                              <button
                                className={`teacher-attempt-item ${selectedAttemptId === result.id ? "active" : ""}`}
                                key={result.id}
                                type="button"
                                aria-pressed={selectedAttemptId === result.id}
                                onClick={() => void loadAttemptDetail(result.id)}
                              >
                                <strong>{result.studentName}</strong>
                                <span>{result.studentEmail}</span>
                                <span>{getResultScoreLabel(result)} · {formatAttemptStatus(result.status)}</span>
                              </button>
                            )) : null}
                          </div>
                        ) : null}
                      </details>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <p className="muted">No hay live talks creados para consultar.</p>
          )}
        </div>
      </div>

      <TeacherAttemptResultPanel
        detail={attemptDetail}
        isLoading={isLoadingDetail}
        onReviewSaved={async () => {
          if (selectedAttemptId) {
            await loadAttemptDetail(selectedAttemptId);
          }

          if (selectedLiveTalkId) {
            const response = await api.get<{ results: TeacherResultAttempt[] }>(
              `/teacher/live-talks/${selectedLiveTalkId}/results`,
            );
            setResults(response.data.results);
          }
        }}
      />
    </section>
  );
}

function TeacherAttemptResultPanel(props: {
  detail: TeacherAttemptDetail | null;
  isLoading: boolean;
  onReviewSaved: () => Promise<void>;
}) {
  if (props.isLoading) {
    return <section className="panel"><p>Cargando detalle...</p></section>;
  }

  if (!props.detail) {
    return (
      <section className="panel empty-state">
        <p className="eyebrow">Detalle</p>
        <h2>Selecciona un intento</h2>
        <p className="muted">Aquí verás nota, rúbrica, evidencia, retroalimentación y transcripción.</p>
      </section>
    );
  }

  return (
    <section className="panel result-detail">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Intento estudiante</p>
          <h2>{props.detail.studentName}</h2>
          <p className="muted">{props.detail.liveTalkTitle} · {props.detail.academicSpaceName}</p>
        </div>
        <div className="score-badge">
          <span>Nota</span>
          <strong>{getResultScoreValue(props.detail)}</strong>
        </div>
      </div>

      <div className="result-section">
        <h3>Estado académico</h3>
        <p className="muted">
          {formatAttemptStatus(props.detail.status)} · Revisión docente: {props.detail.teacherReviewed ? "Sí" : "No"}
        </p>
        {props.detail.evaluationStatus === "failed" && props.detail.evaluationError ? (
          <p className="error-text">{props.detail.evaluationError}</p>
        ) : null}
        {props.detail.teacherOverrideReason ? (
          <p>{props.detail.teacherOverrideReason}</p>
        ) : null}
      </div>

      <TeacherReviewForm detail={props.detail} onReviewSaved={props.onReviewSaved} />

      {props.detail.feedback ? (
        <div className="result-section">
          <h3>Retroalimentación</h3>
          <p>{props.detail.feedback.summary}</p>
          <ResultTextBlock title="Fortalezas" text={props.detail.feedback.strengths} />
          <ResultTextBlock title="Aspectos por fortalecer" text={props.detail.feedback.improvementOpportunities} />
          <ResultTextBlock title="Recomendaciones" text={props.detail.feedback.recommendations} />
        </div>
      ) : (
        <div className="result-section">
          <h3>Retroalimentación</h3>
          <p className="muted">La retroalimentación aún no está disponible.</p>
        </div>
      )}

      <div className="result-section">
        <h3>Rúbrica por temática</h3>
        <div className="rubric-list">
          {props.detail.rubricItems.length === 0 ? (
            <p className="muted">La rúbrica aún no está disponible.</p>
          ) : null}
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

function TeacherReviewForm(props: {
  detail: TeacherAttemptDetail;
  onReviewSaved: () => Promise<void>;
}) {
  const [teacherReviewed, setTeacherReviewed] = useState(true);
  const [overrideEnabled, setOverrideEnabled] = useState(props.detail.teacherOverrideGrade !== null);
  const [overrideGrade, setOverrideGrade] = useState(
    props.detail.teacherOverrideGrade?.toString() ?? props.detail.finalScore?.toString() ?? "",
  );
  const [overrideReason, setOverrideReason] = useState(props.detail.teacherOverrideReason ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setTeacherReviewed(true);
    setOverrideEnabled(props.detail.teacherOverrideGrade !== null);
    setOverrideGrade(props.detail.teacherOverrideGrade?.toString() ?? props.detail.finalScore?.toString() ?? "");
    setOverrideReason(props.detail.teacherOverrideReason ?? "");
    setError("");
    setMessage("");
  }, [props.detail.id, props.detail.teacherOverrideGrade, props.detail.teacherOverrideReason, props.detail.finalScore]);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const parsedOverrideGrade = overrideEnabled ? Number(overrideGrade) : null;

    if (
      overrideEnabled &&
      (parsedOverrideGrade === null || !Number.isFinite(parsedOverrideGrade) ||
        parsedOverrideGrade < 0 || parsedOverrideGrade > 5)
    ) {
      setError("La nota ajustada debe estar entre 0 y 5.");
      return;
    }

    if (overrideEnabled && overrideReason.trim().length === 0) {
      setError("El ajuste de nota requiere una justificación.");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.patch(`/teacher/attempts/${props.detail.id}/review`, {
        teacherReviewed,
        teacherOverrideGrade: overrideEnabled ? parsedOverrideGrade : null,
        teacherOverrideReason: overrideEnabled ? overrideReason.trim() : null,
      });
      setMessage("Revisión docente guardada.");
      await props.onReviewSaved();
    } catch (unknownError) {
      setError(getApiErrorMessage(unknownError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="result-section review-form" onSubmit={submitReview}>
      <h3>Revisión docente</h3>
      {props.detail.evaluationStatus === "failed" ? (
        <p className="error-text">No se puede revisar una evaluación fallida hasta que exista una nota calculada.</p>
      ) : null}
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={teacherReviewed}
          onChange={(event) => setTeacherReviewed(event.target.checked)}
        />
        Marcar como revisado
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={overrideEnabled}
          onChange={(event) => setOverrideEnabled(event.target.checked)}
        />
        Ajustar nota con justificación
      </label>
      {overrideEnabled ? (
        <>
          <label>
            Nota ajustada
            <input
              type="number"
              min="0"
              max="5"
              step="0.01"
              value={overrideGrade}
              onChange={(event) => setOverrideGrade(event.target.value)}
              required
            />
          </label>
          <label>
            Justificación del ajuste
            <textarea
              value={overrideReason}
              onChange={(event) => setOverrideReason(event.target.value)}
              required
            />
          </label>
        </>
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}
      {message ? <p className="success-text">{message}</p> : null}
      <button
        type="submit"
        disabled={isSubmitting || props.detail.evaluationId === null || props.detail.finalScore === null}
      >
        {isSubmitting ? "Guardando..." : "Guardar revisión"}
      </button>
    </form>
  );
}

function formatLiveTalkStatus(status: LiveTalkStatus) {
  if (status === "draft") return "Borrador";
  if (status === "active") return "Activo";
  return "Cerrado";
}
