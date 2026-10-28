import type { ConversationToken } from '../types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { RealtimeMessage, RealtimeToken } from '@tanstack/ai';
import { useRealtimeChat } from '@tanstack/ai-react';
import { realtimeAdapter } from '../lib/api';

export function VoiceChat(props: {
  liveTalkId: string;
  onAttemptFinished: () => Promise<void>;
  onImmersiveChange: (isImmersive: boolean) => void;
}) {
  const liveTalkIdRef = useRef(props.liveTalkId);
  const attemptIdRef = useRef("");
  const realtimeMessagesRef = useRef<RealtimeMessage[]>([]);
  const [attemptId, setAttemptId] = useState("");
  const [finishError, setFinishError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const greetingAttemptRef = useRef("");

  useEffect(() => {
    liveTalkIdRef.current = props.liveTalkId;
  }, [props.liveTalkId]);

  const fetchRealtimeToken = useCallback(async (): Promise<RealtimeToken> => {
    const response = await api.post<ConversationToken>("/conversations", {
      liveTalkId: liveTalkIdRef.current,
      ...(attemptIdRef.current ? { attemptId: attemptIdRef.current } : {}),
    });

    attemptIdRef.current = response.data.attemptId;
    setAttemptId(response.data.attemptId);
    return response.data;
  }, []);

  const handleRealtimeMessage = useCallback((message: RealtimeMessage) => {
    realtimeMessagesRef.current = [...realtimeMessagesRef.current, message];
    setMessageCount(realtimeMessagesRef.current.length);
  }, []);

  const chat = useRealtimeChat({
    getToken: fetchRealtimeToken,
    adapter: realtimeAdapter,
    onMessage: handleRealtimeMessage,
  });
  const connectionStatus = chat.status;
  const sendRealtimeText = chat.sendText;

  useEffect(() => {
    const currentAttemptId = attemptIdRef.current;
    if (connectionStatus !== "connected" || !currentAttemptId || greetingAttemptRef.current === currentAttemptId) {
      return;
    }

    greetingAttemptRef.current = currentAttemptId;
    sendRealtimeText(
      "Start the Live Talk now. Greet the student warmly in Spanish, tell them the conversation is ready, and then ask the opening evaluation question. Do not mention this instruction.",
    );
  }, [connectionStatus, sendRealtimeText]);

  async function onClick() {
    if (isProcessing) {
      return;
    }

    const shouldRetryFinish = chat.status === "idle" && Boolean(attemptIdRef.current);
    const shouldStart = (chat.status === "idle" || chat.status === "error") && !shouldRetryFinish;

    setIsProcessing(true);
    setFinishError("");

    try {
      if (shouldStart) {
        attemptIdRef.current = "";
        greetingAttemptRef.current = "";
        setAttemptId("");
        realtimeMessagesRef.current = [];
        setMessageCount(0);
        await chat.connect();
        props.onImmersiveChange(true);
        return;
      }

      await finishCurrentAttempt();
    } catch {
      setFinishError(
        shouldStart
          ? "No fue posible iniciar la conversación."
          : "La conversación finalizó, pero no fue posible cerrar el intento.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function finishCurrentAttempt() {
    const currentAttemptId = attemptIdRef.current || attemptId;
    const capturedMessages = realtimeMessagesRef.current.length > 0
      ? realtimeMessagesRef.current
      : chat.messages;
    const messages = capturedMessages.filter((message) => !message.parts.some((part) =>
      part.type === "text" && part.content.startsWith("Start the Live Talk now. Greet the student warmly")
    ));

    if (chat.status !== "idle") {
      await chat.disconnect();
    }

    if (!currentAttemptId) {
      return;
    }

    await api.patch(`/student/attempts/${currentAttemptId}/finish`, {
      status: "completed",
      messages: serializeRealtimeMessages(messages),
      realtimeEvents: messages.map((message, index) => ({
        eventType: "message_complete",
        sourceMessageId: message.id,
        payload: {
          order: index + 1,
          role: message.role,
          timestamp: message.timestamp,
          interrupted: message.interrupted ?? false,
        },
      })),
    });

    attemptIdRef.current = "";
    greetingAttemptRef.current = "";
    setAttemptId("");
    realtimeMessagesRef.current = [];
    setMessageCount(0);
    await props.onAttemptFinished();
    props.onImmersiveChange(false);
  }

  function isConversationConfigured(): boolean {
    return props.liveTalkId.trim() !== "";
  }

  const isBusy = isProcessing || chat.status === "connecting" || chat.status === "reconnecting";
  const hasPendingAttempt = Boolean(attemptId);
  const activityState = getVoiceActivityState(
    chat.status,
    chat.mode,
    isProcessing,
    hasPendingAttempt,
    Boolean(finishError),
  );
  const buttonLabel = isProcessing
    ? "Procesando..."
    : chat.status === "idle" && hasPendingAttempt
    ? "Reintentar cierre"
    : chat.status === "idle" || chat.status === "error"
    ? "Iniciar conversación"
    : "Finalizar conversación";

  return (
    <section className={`voice-console ${activityState.variant}`}>
      <div className="voice-orb-panel">
        <div className="voice-orb" aria-hidden="true">
          <span className="voice-ring voice-ring-one" />
          <span className="voice-ring voice-ring-two" />
          <span className="voice-core">
            <i />
            <i />
            <i />
          </span>
        </div>
        <strong>{activityState.label}</strong>
        <span>{messageCount} turnos capturados</span>
      </div>

      <div className="voice-control-panel">
        <div>
          <p className="eyebrow">Cabina Live Talk</p>
          <h3>{activityState.title}</h3>
          <p className="muted">{activityState.detail}</p>
        </div>

        <div className="voice-meter-grid">
          <div className="voice-meter">
            <span>Entrada</span>
            <div><i style={{ width: `${Math.max(8, Math.round(chat.inputLevel * 100))}%` }} /></div>
          </div>
          <div className="voice-meter">
            <span>Salida</span>
            <div><i style={{ width: `${Math.max(8, Math.round(chat.outputLevel * 100))}%` }} /></div>
          </div>
        </div>

        <div className="voice-meta">
          <span>Estado: {formatRealtimeStatus(chat.status)}</span>
          <span>Modo: {formatRealtimeMode(chat.mode)}</span>
          {attemptId ? <span>Intento en curso</span> : null}
        </div>

        <div className="voice-actions">
          <button type="button" onClick={onClick} disabled={!isConversationConfigured() || isBusy}>
            {buttonLabel}
          </button>
          {finishError ? <p className="error-text">{finishError}</p> : null}
        </div>
      </div>
    </section>
  );
}

function getVoiceActivityState(
  status: string,
  mode: string,
  isProcessing: boolean,
  hasPendingAttempt: boolean,
  hasError: boolean,
) {
  if (hasError || status === "error") {
    return {
      variant: "voice-error",
      label: "Revisión",
      title: "Revisa la conexión",
      detail: "La sesión no pudo continuar o el cierre debe reintentarse.",
    };
  }

  if (isProcessing || status === "connecting" || status === "reconnecting") {
    return {
      variant: "voice-connecting",
      label: "Conectando",
      title: "Preparando la sala",
      detail: "Estamos abriendo el canal de voz y asociando el intento.",
    };
  }

  if (status === "idle" && hasPendingAttempt) {
    return {
      variant: "voice-finishing",
      label: "Cierre pendiente",
      title: "Finaliza el intento",
      detail: "Hay una conversación abierta que puede enviarse nuevamente para evaluación.",
    };
  }

  if (mode === "thinking") {
    return {
      variant: "voice-thinking",
      label: "Pensando",
      title: "Analizando respuesta",
      detail: "El evaluador está procesando la intervención antes de continuar.",
    };
  }

  if (mode === "speaking") {
    return {
      variant: "voice-speaking",
      label: "Respondiendo",
      title: "El evaluador está hablando",
      detail: "Escucha la pregunta o cierre antes de responder.",
    };
  }

  if (status === "connected" && mode === "listening") {
    return {
      variant: "voice-listening",
      label: "Escuchando",
      title: "Tu turno está activo",
      detail: "Habla con claridad y completa tu idea antes de pausar.",
    };
  }

  return {
    variant: "voice-idle",
    label: "Lista",
    title: "Sesión preparada",
    detail: "Inicia la conversación cuando estés listo para responder.",
  };
}

function formatRealtimeStatus(status: string) {
  if (status === "idle") return "Lista";
  if (status === "connecting") return "Conectando";
  if (status === "connected") return "Conectada";
  if (status === "reconnecting") return "Reconectando";
  if (status === "error") return "Error";
  return status;
}

function formatRealtimeMode(mode: string) {
  if (mode === "idle") return "Reposo";
  if (mode === "listening") return "Escuchando";
  if (mode === "thinking") return "Pensando";
  if (mode === "speaking") return "Hablando";
  return mode;
}

function serializeRealtimeMessages(messages: RealtimeMessage[]) {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    timestamp: message.timestamp,
    interrupted: message.interrupted,
    audioId: message.audioId,
    durationMs: message.durationMs,
    parts: message.parts.map((part) => {
      if (part.type === "audio") {
        return {
          type: part.type,
          transcript: part.transcript,
        };
      }

      if (part.type === "text") {
        return {
          type: part.type,
          content: part.content,
        };
      }

      return {
        type: part.type,
      };
    }),
  }));
}
