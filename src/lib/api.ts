import { openaiRealtime } from '@tanstack/ai-openai';
import axios from 'axios';
import { apiBaseUrl } from './auth-client';

export const api = axios.create({ baseURL: apiBaseUrl, withCredentials: true });
export const realtimeAdapter = openaiRealtime();
export const institutionalLine = "Ingeniería de Sistemas - Harrizon Alexander Soler Galindo - Diego Alejandro Vela Beltrán - Campus Virtual 2026 - Santoto Tunja - Virtual Challenge";
