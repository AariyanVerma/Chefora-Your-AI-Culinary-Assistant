'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import { createPost } from '../actions';
import { testSimple, testWithDb, testWithAuth } from '../test-actions';
import Image from 'next/image';
import { X, Plus, Upload } from 'lucide-react';

export default function CreatePostPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [images, setImages] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [instructions, setInstructions] = useState<string[]>(['']);
  const [servings, setServings] = useState<number | ''>('');
  const [prepTime, setPrepTime] = useState<number | ''>('');
  const [cookTime, setCookTime] = useState<number | ''>('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | ''>('');
  const [cuisine, setCuisine] = useState('');
  const [dietTags, setDietTags] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/community/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      setImages(prev => [...prev, data.url]);
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Failed to upload image. Please try again.');
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const addIngredient = () => {
    setIngredients(prev => [...prev, '']);
  };

  const updateIngredient = (index: number, value: string) => {
    setIngredients(prev => {
      const newIngredients = [...prev];
      newIngredients[index] = value;
      return newIngredients;
    });
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const addInstruction = () => {
    setInstructions(prev => [...prev, '']);
  };

  const updateInstruction = (index: number, value: string) => {
    setInstructions(prev => {
      const newInstructions = [...prev];
      newInstructions[index] = value;
      return newInstructions;
    });
  };

  const removeInstruction = (index: number) => {
    setInstructions(prev => prev.filter((_, i) => i !== index));
  };

  // Test function to debug server actions
  const testServerActions = async () => {
    console.log('Testing server actions...');
    try {
      const simple = await testSimple();
      console.log('Simple test:', simple);
      
      const dbTest = await testWithDb();
      console.log('DB test:', dbTest);
      
      const authTest = await testWithAuth();
      console.log('Auth test:', authTest);
      
      alert(`Tests complete!\nSimple: ${simple.success}\nDB: ${dbTest.success}\nAuth: ${authTest.success}`);
    } catch (error: any) {
      console.error('Test error:', error);
      alert('Test failed: ' + (error?.message || 'Unknown error'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || images.length === 0) {
      alert('Please provide a title and at least one image');
      return;
    }

    setLoading(true);
    console.log('Starting post creation...');
    console.log('Form data:', {
      title,
      caption,
      visibility,
      imagesCount: images.length,
      ingredientsCount: ingredients.filter(i => i.trim()).length,
      instructionsCount: instructions.filter(i => i.trim()).length,
    });

    try {
      // Check payload size before sending (base64 images can be huge)
      const payload = {
        title,
        caption: caption || undefined,
        visibility,
        media_urls: images,
        ingredients: ingredients.filter(i => i.trim()),
        instructions: instructions.filter(i => i.trim()),
        servings: servings ? Number(servings) : undefined,
        prep_time_minutes: prepTime ? Number(prepTime) : undefined,
        cook_time_minutes: cookTime ? Number(cookTime) : undefined,
        total_time_minutes: prepTime && cookTime ? Number(prepTime) + Number(cookTime) : undefined,
        difficulty: difficulty || undefined,
        cuisine: cuisine || undefined,
        diet_tags: dietTags,
        tags,
      };
      
      // Estimate payload size (base64 strings are ~33% larger than original)
      const estimatedSize = JSON.stringify(payload).length;
      console.log('Payload size estimate:', estimatedSize, 'bytes (~', Math.round(estimatedSize / 1024), 'KB)');
      
      if (estimatedSize > 4.5 * 1024 * 1024) { // 4.5MB limit (Next.js default is ~4.7MB)
        alert('Post data is too large. Please reduce image sizes or use fewer images.');
        setLoading(false);
        return;
      }
      
      console.log('Calling createPost server action...');
      const result = await createPost(payload);

      console.log('Post creation result:', result);

      if (!result || !result.post_id) {
        throw new Error('Post creation failed: No post ID returned');
      }

      console.log('Redirecting to post:', result.post_id);
      router.push(`/community/p/${result.post_id}`);
    } catch (error: any) {
      console.error('Failed to create post - Full error:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      
      // More detailed error message
      let errorMessage = 'Failed to create post. Please try again.';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        // For "Failed to fetch" errors, provide more context
        errorMessage = 'Network error: Could not reach the server. Please check:\n' +
          '1. Your internet connection\n' +
          '2. The server is running\n' +
          '3. Check the browser console and server logs for details';
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="community-create-page">
        <div className="community-header">
          <h1 className="cardTitle" style={{ fontSize: 'var(--fs-xl)', marginBottom: '24px' }}>
            Create New Post
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="community-create-form">
          <div className="community-neon-card" style={{
            padding: 'var(--pad-lg)',
            borderRadius: '20px',
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)'
          }}>
                {/* Title */}
                <div className="community-form-section">
                  <label className="community-form-label">Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input"
                    placeholder="e.g., Creamy Garlic Pasta"
                    required
                  />
                </div>

                {/* Caption */}
                <div className="community-form-section">
                  <label className="community-form-label">Caption</label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="input"
                    placeholder="Share your thoughts about this recipe..."
                    rows={3}
                    maxLength={2000}
                  />
                </div>

                {/* Images */}
                <div className="community-form-section">
                  <label className="community-form-label">Images *</label>
                  <div className="community-image-upload">
                    {images.map((url, index) => (
                      <div key={index} className="community-image-preview">
                        <Image
                          src={url}
                          alt={`Preview ${index + 1}`}
                          width={200}
                          height={200}
                          className="community-image-preview-img"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="community-image-remove"
                          aria-label="Remove image"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    {images.length < 5 && (
                      <label className="community-image-upload-btn">
                        <Upload size={24} />
                        <span>Add Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Visibility */}
                <div className="community-form-section">
                  <label className="community-form-label">Visibility</label>
                  <div className="chip-row" style={{ gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setVisibility('public')}
                      className={`chip tap-ripple ${visibility === 'public' ? 'active' : ''}`}
                    >
                      <span className="chip-label">Public</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibility('friends')}
                      className={`chip tap-ripple ${visibility === 'friends' ? 'active' : ''}`}
                    >
                      <span className="chip-label">Friends Only</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibility('private')}
                      className={`chip tap-ripple ${visibility === 'private' ? 'active' : ''}`}
                    >
                      <span className="chip-label">Private</span>
                    </button>
                  </div>
                </div>

                {/* Recipe Details */}
                <div className="community-form-section">
                  <h3 className="cardTitle" style={{ fontSize: 'var(--fs-md)', marginBottom: '12px' }}>
                    Recipe Details (Optional)
                  </h3>

                  {/* Basic Info */}
                  <div className="community-form-row">
                    <div className="community-form-field">
                      <label className="community-form-label">Servings</label>
                      <input
                        type="number"
                        value={servings}
                        onChange={(e) => setServings(e.target.value ? Number(e.target.value) : '')}
                        className="input"
                        min="1"
                      />
                    </div>
                    <div className="community-form-field">
                      <label className="community-form-label">Prep Time (min)</label>
                      <input
                        type="number"
                        value={prepTime}
                        onChange={(e) => setPrepTime(e.target.value ? Number(e.target.value) : '')}
                        className="input"
                        min="0"
                      />
                    </div>
                    <div className="community-form-field">
                      <label className="community-form-label">Cook Time (min)</label>
                      <input
                        type="number"
                        value={cookTime}
                        onChange={(e) => setCookTime(e.target.value ? Number(e.target.value) : '')}
                        className="input"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="community-form-row" style={{ marginTop: '12px' }}>
                    <div className="community-form-field">
                      <label className="community-form-label">Difficulty</label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value as any)}
                        className="input"
                      >
                        <option value="">Select...</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                    <div className="community-form-field">
                      <label className="community-form-label">Cuisine</label>
                      <input
                        type="text"
                        value={cuisine}
                        onChange={(e) => setCuisine(e.target.value)}
                        className="input"
                        placeholder="e.g., Italian"
                      />
                    </div>
                  </div>

                  {/* Ingredients */}
                  <div className="community-form-section" style={{ marginTop: '16px' }}>
                    <label className="community-form-label">Ingredients</label>
                    {ingredients.map((ingredient, index) => (
                      <div key={index} className="community-form-list-item">
                        <input
                          type="text"
                          value={ingredient}
                          onChange={(e) => updateIngredient(index, e.target.value)}
                          className="input"
                          placeholder={`Ingredient ${index + 1}`}
                        />
                        {ingredients.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeIngredient(index)}
                            className="community-form-remove-btn"
                            aria-label="Remove ingredient"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addIngredient}
                      className="btn ghost tap-ripple"
                      style={{ marginTop: '8px' }}
                    >
                      <Plus size={16} style={{ marginRight: '4px' }} />
                      Add Ingredient
                    </button>
                  </div>

                  {/* Instructions */}
                  <div className="community-form-section" style={{ marginTop: '16px' }}>
                    <label className="community-form-label">Instructions</label>
                    {instructions.map((instruction, index) => (
                      <div key={index} className="community-form-list-item">
                        <textarea
                          value={instruction}
                          onChange={(e) => updateInstruction(index, e.target.value)}
                          className="input"
                          placeholder={`Step ${index + 1}`}
                          rows={2}
                        />
                        {instructions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeInstruction(index)}
                            className="community-form-remove-btn"
                            aria-label="Remove step"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addInstruction}
                      className="btn ghost tap-ripple"
                      style={{ marginTop: '8px' }}
                    >
                      <Plus size={16} style={{ marginRight: '4px' }} />
                      Add Step
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <div className="toolbar" style={{ marginTop: '24px' }}>
                  <button
                    type="submit"
                    className="btn tap-ripple"
                    disabled={loading || !title || images.length === 0}
                  >
                    {loading ? 'Publishing...' : 'Publish Post'}
                  </button>
                  <button
                    type="button"
                    onClick={testServerActions}
                    className="btn ghost tap-ripple"
                    style={{ marginLeft: '8px' }}
                  >
                    Test Server Actions
                  </button>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="btn ghost tap-ripple"
                  >
                    Cancel
                  </button>
                </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

