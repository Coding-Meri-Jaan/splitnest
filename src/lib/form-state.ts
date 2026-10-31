export interface FormState {
  error: string | null;
  message: string | null;
}

export const initialFormState: FormState = { error: null, message: null };
