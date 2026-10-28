import type { AppUser } from './types';
import { EyeIcon, EyeOffIcon } from './components/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from './lib/api';
import { authClient } from './lib/auth-client';
import { institutionalLine } from './lib/api';
import { AdminHome } from './features/admin';
import { TeacherHome } from './features/teacher';
import { StudentHome } from './features/student';
import tutorImage from './assets/virtualchallenge-tutor.png';

export function App() {
  const session = authClient.useSession();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [profileError, setProfileError] = useState<string>("");

  useEffect(() => {
    if (!session.data) {
      setAppUser(null);
      return;
    }

    let isMounted = true;

    api.get<{ user: AppUser }>("/me")
      .then((response) => {
        if (isMounted) {
          setAppUser(response.data.user);
          setProfileError("");
        }
      })
      .catch(() => {
        if (isMounted) {
          setAppUser(null);
          setProfileError("No fue posible cargar el perfil de la aplicación.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session.data]);

  if (session.isPending) {
    return (
      <main className="shell">
        <InstitutionalStrip />
        <p>Cargando sesión...</p>
        <AppFooter />
      </main>
    );
  }

  if (!session.data) {
    return <LoginScreen onSignedIn={session.refetch} />;
  }

  if (profileError) {
    return (
      <main className="shell">
        <InstitutionalStrip />
        <SessionHeader user={appUser} onSignOut={session.refetch} />
        <section className="panel">
          <h1>Perfil no disponible</h1>
          <p>{profileError}</p>
        </section>
        <AppFooter />
      </main>
    );
  }

  if (appUser?.profile?.mustChangePassword) {
    return (
      <main className="shell">
        <InstitutionalStrip />
        <SessionHeader user={appUser} onSignOut={session.refetch} />
        <InitialPasswordScreen
          email={appUser.email}
          onComplete={async () => {
            await authClient.signOut();
            await session.refetch();
            setAppUser(null);
          }}
        />
        <AppFooter />
      </main>
    );
  }

  return (
    <main className="shell">
      <InstitutionalStrip />
      <SessionHeader user={appUser} onSignOut={session.refetch} />
      <RoleHome user={appUser} />
      <AppFooter />
    </main>
  );
}

function LoginScreen(props: {
  onSignedIn: () => Promise<unknown> | unknown;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await authClient.signIn.email({
        email,
        password,
        rememberMe: true,
      });

      if (result.error) {
        setError(result.error.message ?? "No fue posible iniciar sesión.");
      } else {
        await props.onSignedIn();
      }
    } catch {
      setError("No fue posible iniciar sesión.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <InstitutionalStrip />
      <section className="login-shell">
        <div className="login-visual">
          <img src={tutorImage} alt="" />
          <div className="login-visual-copy">
            <p className="eyebrow">VirtualChallenge</p>
            <h1>Evaluación oral asistida</h1>
            <p>
              Autenticación por rol, live talks activos, evidencia auditable y revisión
              académica en un mismo flujo.
            </p>
          </div>
        </div>

        <div className="login-panel">
          <div>
            <p className="eyebrow">Ingreso institucional</p>
            <h2>Acceso a plataforma</h2>
          </div>

          <form className="form-stack" onSubmit={onSubmit}>
            <label>
              Correo
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nombre@institucion.edu.co"
                type="email"
                autoComplete="email"
                required
              />
            </label>

            <label>
              Contraseña
              <span className="password-field">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                />
                <button
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="password-visibility"
                  onClick={() => setShowPassword((visible) => !visible)}
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  type="button"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </span>
            </label>

            {error ? <p className="error-text">{error}</p> : null}

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

        </div>
      </section>
      <AppFooter />
    </main>
  );
}

function InitialPasswordScreen(props: {
  email: string;
  onComplete: () => Promise<void>;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/me/initial-password", { currentPassword, newPassword });
      setSuccess(true);
      window.setTimeout(() => {
        void props.onComplete().catch(() => {
          setError("La contraseña se actualizó, pero no fue posible cerrar la sesión. Sal e ingresa nuevamente.");
        });
      }, 1400);
    } catch {
      setError("No fue posible actualizar la contraseña. Verifica la contraseña temporal e inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="panel initial-password-panel">
      <p className="eyebrow">Primer ingreso</p>
      <h1>Actualiza tu contraseña</h1>
      <p className="muted">
        Tu número de documento es la contraseña temporal. Reemplázala ahora por una
        contraseña nueva de al menos 12 caracteres antes de continuar.
      </p>
      <p className="password-account">
        Cuenta autenticada: <strong>{props.email}</strong>
      </p>
      <form className="form-stack" autoComplete="off" onSubmit={onSubmit}>
        <label>
          Contraseña temporal
          <span className="password-field">
            <input
              type={showCurrentPassword ? "text" : "password"}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="off"
              required
            />
            <button
              aria-label={showCurrentPassword ? "Ocultar contraseña temporal" : "Mostrar contraseña temporal"}
              className="password-visibility"
              onClick={() => setShowCurrentPassword((visible) => !visible)}
              title={showCurrentPassword ? "Ocultar contraseña temporal" : "Mostrar contraseña temporal"}
              type="button"
            >
              {showCurrentPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </span>
        </label>
        <label>
          Nueva contraseña
          <span className="password-field">
            <input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
            />
            <button
              aria-label={showNewPassword ? "Ocultar nueva contraseña" : "Mostrar nueva contraseña"}
              className="password-visibility"
              onClick={() => setShowNewPassword((visible) => !visible)}
              title={showNewPassword ? "Ocultar nueva contraseña" : "Mostrar nueva contraseña"}
              type="button"
            >
              {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </span>
        </label>
        <label>
          Confirmar nueva contraseña
          <span className="password-field">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
            />
            <button
              aria-label={showConfirmPassword ? "Ocultar confirmación" : "Mostrar confirmación"}
              className="password-visibility"
              onClick={() => setShowConfirmPassword((visible) => !visible)}
              title={showConfirmPassword ? "Ocultar confirmación" : "Mostrar confirmación"}
              type="button"
            >
              {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </span>
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        {success ? (
          <p className="success-text" role="status">
            Contraseña actualizada. Te redirigiremos al inicio de sesión.
          </p>
        ) : null}
        <button type="submit" disabled={isSubmitting || success}>
          {isSubmitting ? "Actualizando..." : success ? "Actualizada" : "Guardar contraseña"}
        </button>
      </form>
    </section>
  );
}

function InstitutionalStrip() {
  return <div className="institutional-strip">{institutionalLine}</div>;
}

function AppFooter() {
  return <footer className="app-footer">{institutionalLine}</footer>;
}

function SessionHeader(props: {
  user: AppUser | null;
  onSignOut: () => void;
}) {
  async function signOut() {
    await authClient.signOut();
    props.onSignOut();
  }

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">VirtualChallenge</p>
        <strong>{props.user?.name ?? "Usuario autenticado"}</strong>
      </div>
      <div className="topbar-actions">
        <span>{props.user?.profile?.role ?? "Sin perfil"}</span>
        <button type="button" onClick={signOut}>Salir</button>
      </div>
    </header>
  );
}

function RoleHome(props: {
  user: AppUser | null;
}) {
  const role = props.user?.profile?.role;

  if (role === "admin") {
    return <AdminHome user={props.user} />;
  }

  if (role === "docente") {
    return <TeacherHome user={props.user} />;
  }

  if (role === "estudiante") {
    return <StudentHome user={props.user} />;
  }

  return (
    <section className="panel empty-state">
      <p className="eyebrow">Perfil pendiente</p>
      <h1>Usuario sin rol activo</h1>
      <p className="muted">El usuario inició sesión, pero aún no tiene perfil de aplicación.</p>
    </section>
  );
}
