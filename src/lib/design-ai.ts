import { supabase } from '@/integrations/supabase/client';

export interface ExternalDesignAIAction {
  type: 'move'|'scale'|'style'|'bind'|'show'|'hide'|'duplicate'|'align'|'group';
  target: string;
  value?: Record<string, unknown>;
}
export interface ExternalDesignAIResult { actions: ExternalDesignAIAction[]; message: string; }

export async function askExternalDesignAI(prompt: string): Promise<ExternalDesignAIResult> {
  const { data, error } = await supabase.functions.invoke('design-ai', { body: { prompt } });
  if (error) throw error;
  return {
    actions: Array.isArray(data?.actions) ? data.actions : [],
    message: String(data?.message || ''),
  };
}
