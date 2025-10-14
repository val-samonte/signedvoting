import { atom } from 'jotai';

// Proposal form data atom
export const proposalFormDataAtom = atom({
  name: '',
  description: '',
  choices: ['', '']
});

// Proposal form errors atom
export const proposalFormErrorsAtom = atom<Record<string, string>>({});

// Proposal form validation atom
export const isProposalFormValidAtom = atom((get) => {
  const formData = get(proposalFormDataAtom);
  const errors = get(proposalFormErrorsAtom);
  
  // Basic validation
  const hasName = formData.name.length >= 6 && formData.name.length <= 64;
  const hasChoices = formData.choices.filter(choice => choice.trim() !== '').length >= 2;
  const hasNoErrors = Object.keys(errors).length === 0;
  
  return hasName && hasChoices && hasNoErrors;
});

// Helper atoms for individual fields
export const proposalNameAtom = atom(
  (get) => get(proposalFormDataAtom).name,
  (get, set, newName: string) => {
    const currentData = get(proposalFormDataAtom);
    set(proposalFormDataAtom, { ...currentData, name: newName });
    
    // Clear name error when user types
    const errors = get(proposalFormErrorsAtom);
    if (errors.name) {
      set(proposalFormErrorsAtom, { ...errors, name: '' });
    }
  }
);

export const proposalDescriptionAtom = atom(
  (get) => get(proposalFormDataAtom).description,
  (get, set, newDescription: string) => {
    const currentData = get(proposalFormDataAtom);
    set(proposalFormDataAtom, { ...currentData, description: newDescription });
  }
);

export const proposalChoicesAtom = atom(
  (get) => get(proposalFormDataAtom).choices,
  (get, set, newChoices: string[]) => {
    const currentData = get(proposalFormDataAtom);
    set(proposalFormDataAtom, { ...currentData, choices: newChoices });
  }
);

// Individual choice atoms
export const proposalChoiceAtom = atom(
  null,
  (get, set, { index, value }: { index: number; value: string }) => {
    const choices = get(proposalChoicesAtom);
    const newChoices = [...choices];
    newChoices[index] = value;
    set(proposalChoicesAtom, newChoices);
    
    // Clear choice error when user types
    const errors = get(proposalFormErrorsAtom);
    if (errors[`choices.${index}`]) {
      set(proposalFormErrorsAtom, { ...errors, [`choices.${index}`]: '' });
    }
  }
);

// Add choice atom
export const addChoiceAtom = atom(
  null,
  (get, set) => {
    const choices = get(proposalChoicesAtom);
    set(proposalChoicesAtom, [...choices, '']);
  }
);

// Remove choice atom
export const removeChoiceAtom = atom(
  null,
  (get, set, index: number) => {
    const choices = get(proposalChoicesAtom);
    if (choices.length > 2) {
      const newChoices = choices.filter((_, i) => i !== index);
      set(proposalChoicesAtom, newChoices);
    }
  }
);

// Reset form atom
export const resetProposalFormAtom = atom(
  null,
  (get, set, initialData?: { name: string; description: string; choices: string[] }) => {
    set(proposalFormDataAtom, initialData || {
      name: '',
      description: '',
      choices: ['', '']
    });
    set(proposalFormErrorsAtom, {});
  }
);
