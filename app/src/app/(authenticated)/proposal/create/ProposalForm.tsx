'use client';

import { useState } from 'react';
import { z } from 'zod';
import { ProposalPreview } from './ProposalPreview';
import { PlusIcon, TrashIcon } from '@phosphor-icons/react';

// Zod validation schema
const proposalSchema = z.object({
  name: z.string()
    .min(6, 'Name must be at least 6 characters long')
    .max(64, 'Name must be at most 64 characters long'),
  description: z.string().optional(),
  choices: z.array(z.string().min(1, 'Choice cannot be empty'))
    .min(2, 'At least 2 choices are required')
});

type ProposalFormData = z.infer<typeof proposalSchema>;

export function ProposalForm() {
  const [formData, setFormData] = useState<ProposalFormData>({
    name: '',
    description: '',
    choices: ['', '']
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    try {
      proposalSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          const path = err.path.join('.');
          newErrors[path] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, name: value }));
    
    // Clear error when user starts typing
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: '' }));
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, description: e.target.value }));
  };

  const handleChoiceChange = (index: number, value: string) => {
    const newChoices = [...formData.choices];
    newChoices[index] = value;
    setFormData(prev => ({ ...prev, choices: newChoices }));
    
    // Clear error when user starts typing
    if (errors[`choices.${index}`]) {
      setErrors(prev => ({ ...prev, [`choices.${index}`]: '' }));
    }
  };

  const addChoice = () => {
    setFormData(prev => ({ ...prev, choices: [...prev.choices, ''] }));
  };

  const removeChoice = (index: number) => {
    if (formData.choices.length > 2) {
      const newChoices = formData.choices.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, choices: newChoices }));
    }
  };

  const getChoiceLabel = (index: number) => {
    return String.fromCharCode(97 + index); // a, b, c, etc.
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Form Column */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Proposal Details</h2>
          
          <div className="space-y-6">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Proposal Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={handleNameChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter proposal name (6-64 characters)"
                maxLength={64}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.name.length}/64 characters
              </p>
            </div>

            {/* Description Field */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={handleDescriptionChange}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                {formData.choices.map((choice, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 text-sm font-medium rounded-full flex items-center justify-center">
                      {getChoiceLabel(index)}.
                    </span>
                    <input
                      type="text"
                      value={choice}
                      onChange={(e) => handleChoiceChange(index, e.target.value)}
                      className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors[`choices.${index}`] ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder={`Choice ${getChoiceLabel(index).toUpperCase()}`}
                    />
                    {formData.choices.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeChoice(index)}
                        className="flex-shrink-0 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <TrashIcon size={16} />
                      </button>
                    )}
                  </div>
                ))}
                
                {errors.choices && (
                  <p className="text-sm text-red-600">{errors.choices}</p>
                )}
                
                <button
                  type="button"
                  onClick={addChoice}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  <PlusIcon size={16} />
                  <span>Add Choice</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Column */}
      <div>
        <ProposalPreview
          name={formData.name}
          description={formData.description || ''}
          choices={formData.choices.filter(choice => choice.trim() !== '')}
        />
      </div>
    </div>
  );
}
