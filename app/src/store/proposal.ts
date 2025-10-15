import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { getStroke } from 'perfect-freehand';
import { Keypair } from '@solana/web3.js';
import { createHash } from 'crypto';

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

// Validation errors atom that sets specific error messages
export const validateProposalFormAtom = atom(
  null,
  (get, set) => {
    const formData = get(proposalFormDataAtom);
    const newErrors: Record<string, string> = {};
    
    // Validate name
    if (formData.name.length < 6) {
      newErrors.name = 'Name must be at least 6 characters long';
    } else if (formData.name.length > 64) {
      newErrors.name = 'Name must be at most 64 characters long';
    }
    
    // Validate choices
    const validChoices = formData.choices.filter(choice => choice.trim() !== '');
    if (validChoices.length < 2) {
      newErrors.choices = 'At least 2 choices are required';
    }
    
    // Validate individual choices
    formData.choices.forEach((choice, index) => {
      if (choice.trim() === '' && validChoices.length < 2) {
        newErrors[`choices.${index}`] = 'Choice cannot be empty';
      }
    });
    
    set(proposalFormErrorsAtom, newErrors);
    return Object.keys(newErrors).length === 0;
  }
);

// Field-specific validation atoms
export const validateNameAtom = atom(
  null,
  (get, set) => {
    const formData = get(proposalFormDataAtom);
    const currentErrors = get(proposalFormErrorsAtom);
    const newErrors = { ...currentErrors };
    
    // Validate name
    if (formData.name.length < 6) {
      newErrors.name = 'Name must be at least 6 characters long';
    } else if (formData.name.length > 64) {
      newErrors.name = 'Name must be at most 64 characters long';
    } else {
      delete newErrors.name; // Clear error if valid
    }
    
    set(proposalFormErrorsAtom, newErrors);
  }
);

export const validateChoiceAtom = atom(
  null,
  (get, set, index: number) => {
    const formData = get(proposalFormDataAtom);
    const currentErrors = get(proposalFormErrorsAtom);
    const newErrors = { ...currentErrors };
    
    // Validate specific choice
    const choice = formData.choices[index];
    if (choice.trim() === '') {
      newErrors[`choices.${index}`] = 'Choice cannot be empty';
    } else {
      delete newErrors[`choices.${index}`]; // Clear error if valid
    }
    
    // Also validate overall choices count
    const validChoices = formData.choices.filter(c => c.trim() !== '');
    if (validChoices.length < 2) {
      newErrors.choices = 'At least 2 choices are required';
    } else {
      delete newErrors.choices; // Clear error if valid
    }
    
    set(proposalFormErrorsAtom, newErrors);
  }
);

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

// AtomFamily for storing signature strokes by proposal ID
export const proposalSignatureAtomFamily = atomFamily((proposalId: number) => 
  atom<number[][][]>([]) // Array of stroke groups
);

// Helper function to convert strokes to SVG string
const getSignatureSvg = (strokes: number[][][]) => {
  if (strokes.length === 0) return '';
  
  const getSvgPathFromStroke = (stroke: number[][]) => {
    if (stroke.length < 4) return '';
    
    const average = (a: number, b: number) => (a + b) / 2;
    let a = stroke[0];
    let b = stroke[1];
    const c = stroke[2];

    let pathData = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(b[1], c[1]).toFixed(2)} T`;

    for (let i = 2, max = stroke.length - 1; i < max; i++) {
      a = stroke[i];
      b = stroke[i + 1];
      pathData += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(2)} `;
    }

    pathData += 'Z';
    return pathData;
  };

  const paths = strokes.map(strokePoints => {
    const stroke = getStroke(strokePoints, {
      size: 4,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: true,
      last: true,
    });
    return getSvgPathFromStroke(stroke);
  }).filter(path => path !== '');
  
  if (paths.length === 0) return '';
  
  return `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
    ${paths.map(path => `<path d="${path}" fill="black" stroke="black" stroke-width="1"/>`).join('')}
  </svg>`;
};

// Utility functions for signature processing (run only when needed)

// 1. Convert signature strokes to SVG string
export const getSignatureSvgFromStrokes = (strokes: number[][][]) => {
  return getSignatureSvg(strokes);
};

// 2. Convert SVG string to PNG blob
export const getPngBlobFromSvg = async (svgString: string, proposalId: number): Promise<Blob | null> => {
  if (!svgString) return null;
  
  // Convert SVG to PNG blob
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  canvas.width = 300;
  canvas.height = 200;
  
  const img = new Image();
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(svgBlob);
  
  return new Promise<Blob | null>((resolve) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      
      // Convert canvas to PNG blob
      canvas.toBlob((blob) => {
        if (blob) {
          // Store base64 in localStorage as backup for recovery only
          const storageKey = `${proposalId}_signature`;
          if (typeof window !== 'undefined') {
            const reader = new FileReader();
            reader.onload = () => {
              localStorage.setItem(storageKey, reader.result as string);
            };
            reader.readAsDataURL(blob);
          }
        }
        
        URL.revokeObjectURL(url);
        resolve(blob);
      }, 'image/png');
    };
    img.src = url;
  });
};

// 3. Generate SHA256 hash from blob
export const getSha256FromBlob = async (blob: Blob): Promise<string> => {
  if (!blob) return '';
  
  const arrayBuffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// 4. Generate Solana keypair from user ID and blob
export const getKeypairFromUserAndBlob = async (userId: string, blob: Blob): Promise<Keypair | null> => {
  if (!blob) return null;
  
  // Create combined data: user ID + blob
  const userIdBuffer = new TextEncoder().encode(userId);
  const blobBuffer = await blob.arrayBuffer();
  
  // Combine user ID and blob data
  const combinedBuffer = new Uint8Array(userIdBuffer.length + blobBuffer.byteLength);
  combinedBuffer.set(userIdBuffer, 0);
  combinedBuffer.set(new Uint8Array(blobBuffer), userIdBuffer.length);
  
  // Hash the combined data
  const hashBuffer = await crypto.subtle.digest('SHA-256', combinedBuffer);
  const hashArray = new Uint8Array(hashBuffer);
  
  // Use the hash as seed for keypair (first 32 bytes)
  const keypair = Keypair.fromSeed(hashArray.slice(0, 32));
  
  return keypair;
};

// 5. Generate final SHA256 of the first SHA256
export const getFinalSha256 = async (sha256: string): Promise<string> => {
  if (!sha256) return '';
  
  // Use a simple approach that works with TypeScript
  const encoder = new TextEncoder();
  const data = encoder.encode(sha256);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as unknown as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// 6. Main function to process signature and return all results
export const processSignature = async (strokes: number[][][], proposalId: number, userId: string) => {
  // 1. Convert strokes to SVG
  const svgString = getSignatureSvgFromStrokes(strokes);
  if (!svgString) {
    throw new Error('No signature strokes provided');
  }
  
  // 2. Convert SVG to PNG blob
  const pngBlob = await getPngBlobFromSvg(svgString, proposalId);
  if (!pngBlob) {
    throw new Error('Failed to generate PNG from signature');
  }
  
  // 3. Generate SHA256 from blob (for logging/debugging)
  const sha256 = await getSha256FromBlob(pngBlob);
  
  // 4. Generate keypair from user ID + blob hash
  const keypair = await getKeypairFromUserAndBlob(userId, pngBlob);
  
  // 5. Generate final SHA256
  const finalSha256 = await getFinalSha256(sha256);
  
  return {
    svgString,
    pngBlob,
    sha256,
    keypair,
    finalSha256
  };
};

// Utility function to recover PNG from localStorage backup
export const recoverSignaturePngFromStorage = async (proposalId: number): Promise<Blob | null> => {
  if (typeof window === 'undefined') return null;
  
  const storageKey = `${proposalId}_signature`;
  const base64Data = localStorage.getItem(storageKey);
  if (!base64Data) return null;
  
  try {
    // Convert base64 back to blob
    const response = await fetch(base64Data);
    return await response.blob();
  } catch (error) {
    console.error('Failed to recover PNG from localStorage:', error);
    return null;
  }
};
