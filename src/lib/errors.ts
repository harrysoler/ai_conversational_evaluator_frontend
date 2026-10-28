import axios from 'axios';

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? 'No fue posible completar la operación.';
  }

  return 'No fue posible completar la operación.';
}
