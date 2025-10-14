'use client';

import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import { PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { 
  proposalNameAtom, 
  proposalDescriptionAtom, 
  proposalChoiceAtom,
  addChoiceAtom,
  removeChoiceAtom,
  proposalChoicesAtom,
  proposalFormErrorsAtom,
  isProposalFormValidAtom,
  validateProposalFormAtom,
  resetProposalFormAtom
} from '@/store/proposal';
import { useEffect } from 'react';

interface ProposalFormProps {
  initialData?: {
    name: string;
    description: string;
    choices: string[];
  };
  onSubmit?: (data: { name: string; description: string; choices: string[] }) => void;
  disabled?: boolean;
  showSubmit?: boolean;
}

export function ProposalForm({ 
  initialData, 
  onSubmit, 
  disabled = false, 
  showSubmit = true 
}: ProposalFormProps) {
  const [name, setName] = useAtom(proposalNameAtom);
  const [description, setDescription] = useAtom(proposalDescriptionAtom);
  const choices = useAtomValue(proposalChoicesAtom);
  const setChoice = useSetAtom(proposalChoiceAtom);
  const addChoice = useSetAtom(addChoiceAtom);
  const removeChoice = useSetAtom(removeChoiceAtom);
  const errors = useAtomValue(proposalFormErrorsAtom);
  const isValid = useAtomValue(isProposalFormValidAtom);
  const validateForm = useSetAtom(validateProposalFormAtom);
  const resetForm = useSetAtom(resetProposalFormAtom);

  // Initialize form with initial data
  useEffect(() => {
    if (initialData) {
      resetForm(initialData);
    }
  }, [initialData, resetForm]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    setName(e.target.value);
  };

  const handleNameBlur = () => {
    if (disabled) return;
    // Trigger validation to show/hide errors only on blur
    validateForm();
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (disabled) return;
    setDescription(e.target.value);
  };

  const handleChoiceChange = (index: number, value: string) => {
    if (disabled) return;
    setChoice({ index, value });
  };

  const handleChoiceBlur = () => {
    if (disabled) return;
    // Trigger validation to show/hide errors only on blur
    validateForm();
  };

  const handleAddChoice = () => {
    if (disabled) return;
    addChoice();
  };

  const handleRemoveChoice = (index: number) => {
    if (disabled) return;
    removeChoice(index);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || !onSubmit) return;
    
    // Validate form and show errors
    const isValid = validateForm();
    if (!isValid) return;
    
    onSubmit({
      name,
      description,
      choices: choices.filter(choice => choice.trim() !== ''),
    });
  };

  const getChoiceLabel = (index: number) => {
    return String.fromCharCode(97 + index); // a, b, c, etc.
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name Field */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Proposal Name *
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={handleNameChange}
          onBlur={handleNameBlur}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.name ? 'border-red-300' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          placeholder="Enter proposal name (6-64 characters)"
          maxLength={64}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          {name.length}/64 characters
        </p>
      </div>

      {/* Description Field */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={handleDescriptionChange}
          disabled={disabled}
          rows={6}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
          placeholder="Describe your proposal in detail (supports Markdown)"
        />
        <p className="mt-1 text-xs text-gray-500">
          Supports Markdown formatting
        </p>
      </div>

      {/* Choices Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Choices *
        </label>
        <div className="space-y-3">
          {choices.map((choice, index) => (
            <div key={index} className="flex items-center space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 text-sm font-medium rounded-full flex items-center justify-center">
                {getChoiceLabel(index)}.
              </span>
              <input
                type="text"
                value={choice}
                onChange={(e) => handleChoiceChange(index, e.target.value)}
                onBlur={handleChoiceBlur}
                disabled={disabled}
                className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors[`choices.${index}`] ? 'border-red-300' : 'border-gray-300'
                } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder={`Choice ${getChoiceLabel(index).toUpperCase()}`}
              />
              {choices.length > 2 && !disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveChoice(index)}
                  className="flex-shrink-0 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <TrashIcon size={16} />
                </button>
              )}
            </div>
          ))}
          
          {errors.choices && (
            <p className="text-sm text-red-600">{errors.choices}</p>
          )}
          
          {!disabled && (
            <button
              type="button"
              onClick={handleAddChoice}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer"
            >
              <PlusIcon size={16} />
              <span>Add Choice</span>
            </button>
          )}
        </div>
      </div>

      {/* Submit Button */}
      {showSubmit && (
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={disabled || !isValid}
            className={`px-8 py-3 rounded-lg font-medium transition-colors ${
              disabled || !isValid
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer'
            }`}
          >
            Create Proposal
          </button>
        </div>
      )}
    </form>
  );
}