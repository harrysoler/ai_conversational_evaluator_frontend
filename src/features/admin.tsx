import type { AdminSection, PageMetadata, ProgramOption, AdminUserFilters, AdminCatalogFilters, AdminSpaceFilters, AdminAssignmentFilters, AppUser, AdminUser, AcademicProgram, AcademicSpace, AdminSummary, AdminAssignment, ConfirmationState } from '../types';
import { ADMIN_PAGE_SIZE, EMPTY_PAGE } from '../types';
import { WorkspaceSidebar, type WorkspaceMenuGroup } from '../components/workspace-sidebar';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { AdminResultsPanel } from './admin-results';
import { AdminUsersPanel, AdminProgramsPanel, AdminSpacesPanel, AdminAssignmentsPanel, ConfirmDialog } from './admin-catalog';
import academyImage from '../assets/virtualchallenge-collage.png';

export function AdminHome(props: {
  user: AppUser | null;
}) {
  const [activeSection, setActiveSection] = useState<AdminSection>("usuarios");
  const [activeItem, setActiveItem] = useState('usuarios.list');
  const [summary, setSummary] = useState<AdminSummary>({
    users: 0,
    programs: 0,
    spaces: 0,
    assignments: 0,
  });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersPagination, setUsersPagination] = useState(EMPTY_PAGE);
  const [usersPage, setUsersPage] = useState(1);
  const [userFilters, setUserFilters] = useState<AdminUserFilters>({ search: "", role: "", active: "" });
  const [programs, setPrograms] = useState<AcademicProgram[]>([]);
  const [programsPagination, setProgramsPagination] = useState(EMPTY_PAGE);
  const [programsPage, setProgramsPage] = useState(1);
  const [programFilters, setProgramFilters] = useState<AdminCatalogFilters>({ search: "", active: "" });
  const [academicSpaces, setAcademicSpaces] = useState<AcademicSpace[]>([]);
  const [programOptions, setProgramOptions] = useState<ProgramOption[]>([]);
  const [spacesPagination, setSpacesPagination] = useState(EMPTY_PAGE);
  const [spacesPage, setSpacesPage] = useState(1);
  const [spaceFilters, setSpaceFilters] = useState<AdminSpaceFilters>({ search: "", active: "", programId: "" });
  const [spaceAssignments, setSpaceAssignments] = useState<AdminAssignment[]>([]);
  const [spaceAssignmentsPagination, setSpaceAssignmentsPagination] = useState(EMPTY_PAGE);
  const [spaceAssignmentsPage, setSpaceAssignmentsPage] = useState(1);
  const [spaceAssignmentFilters, setSpaceAssignmentFilters] = useState<AdminAssignmentFilters>({ search: "", programId: "", spaceId: "", relation: "" });
  const [adminError, setAdminError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadedSections, setLoadedSections] = useState<Set<AdminSection>>(() => new Set());
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null);
  const [editingAssignment, setEditingAssignment] = useState<AdminAssignment | null>(null);

  function showError(message: string) {
    setAdminError(message);
  }

  const loadAdminData = useCallback(async () => {
    setAdminError("");
    setIsLoading(true);

    try {
      const summaryResponse = await api.get<{ summary: AdminSummary }>("/admin/summary");
      setSummary(summaryResponse.data.summary);

      if (activeSection === "usuarios") {
        const response = await api.get<{ users: AdminUser[]; pagination: PageMetadata }>(
          "/admin/users",
          { params: { ...userFilters, page: usersPage, pageSize: ADMIN_PAGE_SIZE } },
        );
        setUsers(response.data.users);
        setUsersPagination(response.data.pagination);
        setUsersPage(response.data.pagination.page);
      } else if (activeSection === "programas") {
        const response = await api.get<{ programs: AcademicProgram[]; pagination: PageMetadata }>(
          "/admin/programs",
          { params: { ...programFilters, page: programsPage, pageSize: ADMIN_PAGE_SIZE } },
        );
        setPrograms(response.data.programs);
        setProgramsPagination(response.data.pagination);
        setProgramsPage(response.data.pagination.page);
      } else if (activeSection === "espacios") {
        const [spacesResponse, programsResponse] = await Promise.all([
          api.get<{ academicSpaces: AcademicSpace[]; pagination: PageMetadata }>(
            "/admin/academic-spaces",
            { params: { ...spaceFilters, page: spacesPage, pageSize: ADMIN_PAGE_SIZE } },
          ),
          api.get<{ programs: ProgramOption[] }>("/admin/programs/options"),
        ]);
        setAcademicSpaces(spacesResponse.data.academicSpaces);
        setSpacesPagination(spacesResponse.data.pagination);
        setSpacesPage(spacesResponse.data.pagination.page);
        setProgramOptions(programsResponse.data.programs);
      } else if (activeSection === "asignaciones") {
        const userView = activeItem === "asignaciones.user";
        const assignmentParams = userView
          ? { search: spaceAssignmentFilters.search, relation: spaceAssignmentFilters.relation }
          : spaceAssignmentFilters;
        const [spaceResponse, programsResponse] = await Promise.all([
          api.get<{ assignments: AdminAssignment[]; pagination: PageMetadata }>(
            "/admin/assignments",
            { params: { scope: "academic_space", ...assignmentParams, page: spaceAssignmentsPage, pageSize: ADMIN_PAGE_SIZE } },
          ),
          api.get<{ programs: ProgramOption[] }>("/admin/programs/options"),
        ]);
        setSpaceAssignments(spaceResponse.data.assignments);
        setSpaceAssignmentsPagination(spaceResponse.data.pagination);
        setSpaceAssignmentsPage(spaceResponse.data.pagination.page);
        setProgramOptions(programsResponse.data.programs);
      }
      setLoadedSections((current) => new Set(current).add(activeSection));
    } catch {
      setAdminError("No fue posible cargar la información administrativa.");
    } finally {
      setIsLoading(false);
    }
  }, [activeSection, activeItem, usersPage, programsPage, spacesPage, spaceAssignmentsPage, userFilters, programFilters, spaceFilters, spaceAssignmentFilters]);

  useEffect(() => {
    void loadAdminData();
    const refreshTimer = window.setInterval(() => {
      if (activeSection !== "historico") void loadAdminData();
    }, 30_000);
    return () => window.clearInterval(refreshTimer);
  }, [loadAdminData, activeSection]);

  const menuGroups: WorkspaceMenuGroup[] = [
    { id: 'usuarios', label: 'Usuarios', count: String(summary.users), items: [
      { id: 'usuarios.list', label: 'Listar usuarios' }, { id: 'usuarios.create', label: 'Crear usuario' },
    ] },
    { id: 'programas', label: 'Programas', count: String(summary.programs), items: [
      { id: 'programas.list', label: 'Listar programas' }, { id: 'programas.create', label: 'Crear programa' },
    ] },
    { id: 'espacios', label: 'Espacios', count: String(summary.spaces), items: [
      { id: 'espacios.list', label: 'Listar espacios' }, { id: 'espacios.create', label: 'Crear espacio' },
    ] },
    { id: 'asignaciones', label: 'Asignaciones', count: String(summary.assignments), items: [
      { id: 'asignaciones.assign', label: 'Asignar usuario' },
      { id: 'asignaciones.user', label: 'Por usuario' }, { id: 'asignaciones.space', label: 'Por espacio' },
    ] },
    { id: 'historico', label: 'Histórico', items: [{ id: 'historico.results', label: 'Resultados' }] },
  ];
  const activeLabel = menuGroups.flatMap((group) => group.items).find((item) => item.id === activeItem)?.label ?? 'Usuarios';

  function selectItem(item: string) {
    setActiveItem(item);
    setActiveSection(item === 'asignaciones.assign' ? 'espacios' : item.split('.')[0] as AdminSection);
  }

  return (
    <section className="role-workspace admin-workspace">
      <div className="workspace-layout">
        <WorkspaceSidebar title="Administración" groups={menuGroups} activeItem={activeItem} onSelect={selectItem} />
        <div className="workspace-main">
          <section className="workspace-hero admin-control-hero">
            <div className="hero-copy">
              <p className="eyebrow">Administración</p>
              <h1>Centro de configuración académica</h1>
              <p>Ordena la operación desde la base institucional hasta la evidencia de cada evaluación.</p>
            </div>
            <div className="hero-media"><img src={academyImage} alt="" /></div>
            <div className="hero-badge"><span>Rol activo</span><strong>{props.user?.profile?.role ?? "admin"}</strong></div>
          </section>
          <div className="workspace-content-heading"><p className="eyebrow">Administración</p><h2>{activeLabel}</h2></div>

      {adminError ? <p className="error-text">{adminError}</p> : null}
      {isLoading && !loadedSections.has(activeSection) ? <section className="panel"><p>Cargando sección...</p></section> : null}
      {loadedSections.has(activeSection) && activeSection === "usuarios" ? (
        <AdminUsersPanel
          key={activeItem}
          users={users}
          pagination={usersPagination}
          isLoading={isLoading}
          onPageChange={setUsersPage}
          filters={userFilters}
          onFilter={(filters) => { setUserFilters(filters); setUsersPage(1); }}
          currentUserId={props.user?.id ?? ""}
          onChanged={loadAdminData}
          confirm={setConfirmation}
          showError={showError}
          navigationAction={activeItem === 'usuarios.create' ? 'create' : undefined}
          onNavigationClose={() => selectItem('usuarios.list')}
        />
      ) : null}
      {loadedSections.has(activeSection) && activeSection === "programas" ? (
        <AdminProgramsPanel
          key={activeItem}
          programs={programs}
          pagination={programsPagination}
          isLoading={isLoading}
          onPageChange={setProgramsPage}
          filters={programFilters}
          onFilter={(filters) => { setProgramFilters(filters); setProgramsPage(1); }}
          onChanged={loadAdminData}
          confirm={setConfirmation}
          showError={showError}
          navigationAction={activeItem === 'programas.create' ? 'create' : undefined}
          onNavigationClose={() => selectItem('programas.list')}
        />
      ) : null}
      {loadedSections.has(activeSection) && activeSection === "espacios" ? (
        <AdminSpacesPanel
          key={activeItem}
          academicSpaces={academicSpaces}
          programs={programOptions}
          pagination={spacesPagination}
          isLoading={isLoading}
          onPageChange={setSpacesPage}
          filters={spaceFilters}
          onFilter={(filters) => { setSpaceFilters(filters); setSpacesPage(1); }}
          onChanged={loadAdminData}
          confirm={setConfirmation}
          showError={showError}
          navigationAction={activeItem === 'espacios.create' ? 'create' : activeItem === 'asignaciones.assign' ? 'assign' : undefined}
          editingAssignment={editingAssignment}
          onAssignmentSaved={() => setEditingAssignment(null)}
          onNavigationClose={() => {
            if (activeItem === 'asignaciones.assign') {
              setEditingAssignment(null);
              selectItem('asignaciones.user');
            } else selectItem('espacios.list');
          }}
        />
      ) : null}
      {loadedSections.has(activeSection) && activeSection === "asignaciones" ? (
        <AdminAssignmentsPanel
          spaceAssignments={spaceAssignments}
          spacePagination={spaceAssignmentsPagination}
          onSpacePageChange={setSpaceAssignmentsPage}
          programOptions={programOptions}
          spaceFilters={spaceAssignmentFilters}
          onSpaceFilter={(filters) => { setSpaceAssignmentFilters(filters); setSpaceAssignmentsPage(1); }}
          isLoading={isLoading}
          onChanged={loadAdminData}
          confirm={setConfirmation}
          showError={showError}
          view={activeItem === 'asignaciones.space' ? 'space' : 'user'}
          onEdit={(assignment) => {
            setEditingAssignment(assignment);
            selectItem('asignaciones.assign');
          }}
        />
      ) : null}
      {activeSection === "historico" ? (
        <AdminResultsPanel />
      ) : null}
        </div>
      </div>

      {confirmation ? (
        <ConfirmDialog
          confirmation={confirmation}
          onClose={() => setConfirmation(null)}
        />
      ) : null}
    </section>
  );
}
